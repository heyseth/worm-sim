"""Builds js/constants.js, the simulated connectome, from published data.

Sources (download both, then run `python3 tools/build_connectome.py COOK.xlsx FENYVES.xlsx`):

* Cook et al. (2019) "Whole-animal connectomes of both Caenorhabditis elegans sexes", Nature 571:63-71.
  Supplementary Information 5, adjacency matrices, corrected July 2020:
  https://github.com/openworm/ConnectomeToolbox/blob/main/cect/data/SI%205%20Connectome%20adjacency%20matrices%2C%20corrected%20July%202020.xlsx
  Gives chemical synapses and gap junctions separately for the adult hermaphrodite.

* Fenyves et al. (2020) "Synaptic polarity and sign-balance prediction using gene expression data in the
  Caenorhabditis elegans chemical synapse neuronal connectome network", PLoS Comput Biol 16:e1007974.
  S3 Data (journal.pcbi.1007974.s003.xlsx), also at
  https://github.com/francescorandi/wormneuroatlas/blob/main/wormneuroatlas/data/journal.pcbi.1007974.s003.xlsx
  Predicts whether each neuron-to-neuron chemical synapse excites or inhibits, from the presynaptic
  neurotransmitter and the postsynaptic ionotropic receptors.

How each chemical synapse gets its sign:
* Fenyves predicts + or -: used as is.
* Fenyves predicts "complex" (the target has receptors of both signs for the transmitter): the sign of
  whichever receptor class is in the majority, or 0 on a tie.
* No prediction (unknown transmitter or receptors): left out. Counting them as excitatory instead
  (UNPREDICTED_SIGN=1) floods the network with recurrent excitation that drives every neuron to saturation.
* Neuron to body wall muscle: acetylcholine excites and GABA inhibits. Other transmitters are left out,
  because body wall muscles have no receptors for them.
* Tyramine from RIM: RIM also releases tyramine, which inhibits AVB, RMD, SMD and neck muscles through
  the tyramine-gated chloride channel LGC-55 (Pirri et al., 2009, Neuron 62:526-538). RIM's synapses
  onto those cells are made inhibitory.

Weights are Cook's counts of electron-microscope sections, scaled by WEIGHT_SCALE to roughly the size of
synapse counts.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsx import Workbook  # noqa: E402

WEIGHT_SCALE = 0.4
UNPREDICTED_SIGN = int(os.environ.get("UNPREDICTED_SIGN", "0"))  # Sign given to synapses Fenyves could not predict
NEURON_GROUPS = {"SENSORY NEURONS", "INTERNEURONS", "MOTOR NEURONS", "SEX SPECIFIC"}
MUSCLE = re.compile(r"^M[DV][LR]\d\d$")
LGC55_TARGETS = re.compile(r"^(AVB[LR]|RMD.*|SMD.*|M[DV][LR]0[1-8])$")


def norm(name):
    """Cook and Fenyves names to the simulation's: VA01 -> VA1, dBWML7 -> MDL07."""
    name = str(name).strip()
    m = re.match(r"^([dv])BWM([LR])(\d+)$", name)
    if m:
        return "M%s%s%02d" % (m.group(1).upper(), m.group(2), int(m.group(3)))
    m = re.match(r"^([A-Z]+)0(\d)$", name)
    if m:
        return m.group(1) + m.group(2)
    return name


def read_matrix(wb, sheet):
    """Returns ({pre: {post: weight}}, {cell: group}) for one adjacency sheet."""
    rows = wb.rows(sheet)
    header, group_row = rows[2], rows[0]
    col_group, group = {}, None
    for j in range(3, len(header)):
        if j < len(group_row) and group_row[j]:
            group = group_row[j]
        col_group[j] = group
    edges, groups, group = {}, {}, None
    for i in range(3, len(rows)):
        r = rows[i]
        if r and r[0]:
            group = r[0]
        if len(r) < 3 or not r[2]:
            continue
        pre = norm(r[2])
        groups[pre] = group
        for j in range(3, min(len(r), len(header))):
            if r[j] and header[j]:
                post = norm(header[j])
                groups.setdefault(post, col_group[j])
                edges.setdefault(pre, {})[post] = int(r[j])
    return edges, groups


def read_fenyves(path):
    wb = Workbook(path)
    transmitter = {}
    for r in wb.rows("1. NT expr")[1:]:
        if r and r[0]:
            transmitter[norm(r[0])] = r[1]
    predictions = {}
    for r in wb.rows("5. Sign prediction")[2:]:
        if r and r[0] and len(r) > 16:
            classes = [int(x) if x not in (None, "") else 0 for x in r[6:12]]  # Glu+ Glu- ACh+ ACh- GABA+ GABA-
            predictions[(norm(r[0]), norm(r[3]))] = (r[16], classes)
    return transmitter, predictions


def synapse_sign(pre, post, transmitter, predictions, counts):
    if MUSCLE.match(post):
        nt = transmitter.get(pre)
        sign = {"ACh": 1, "GABA": -1}.get(nt, 0)
        counts["muscle " + (nt or "unknown")] += 1
    else:
        prediction, classes = predictions.get((pre, post), ("no pred", None))
        if prediction == "+":
            sign = 1
        elif prediction == "-":
            sign = -1
        elif prediction == "complex":
            excitatory = classes[0] + classes[2] + classes[4]
            inhibitory = classes[1] + classes[3] + classes[5]
            sign = (excitatory > inhibitory) - (inhibitory > excitatory)
        else:
            sign = UNPREDICTED_SIGN
        counts[prediction if prediction in ("+", "-", "complex") else "no pred"] += 1
    if pre in ("RIML", "RIMR") and LGC55_TARGETS.match(post):
        sign = -1
        counts["tyramine"] += 1
    return sign


def to_js(name, table, comment):
    lines = ["// " + comment, "var %s = {" % name]
    for pre in sorted(table):
        targets = ", ".join("%s: %s" % (post, json.dumps(w)) for post, w in sorted(table[pre].items()))
        lines.append("\t%s: { %s }," % (pre, targets))
    lines.append("};")
    return "\n".join(lines)


def main(cook_path, fenyves_path, out_path):
    wb = Workbook(cook_path)
    chem, groups = read_matrix(wb, "hermaphrodite chemical")
    gap, gap_groups = read_matrix(wb, "hermaphrodite gap jn symmetric")
    groups.update(gap_groups)
    transmitter, predictions = read_fenyves(fenyves_path)

    def is_neuron(cell):
        return groups.get(cell) in NEURON_GROUPS

    counts = {k: 0 for k in ("+", "-", "complex", "no pred", "tyramine")}
    counts.update({"muscle ACh": 0, "muscle GABA": 0})
    weights = {}
    for pre, targets in chem.items():
        if not is_neuron(pre):
            continue
        for post, w in targets.items():
            if not (is_neuron(post) or MUSCLE.match(post)):
                continue
            counts.setdefault("muscle " + (transmitter.get(pre) or "unknown"), 0)
            sign = synapse_sign(pre, post, transmitter, predictions, counts)
            if sign:
                weights.setdefault(pre, {})[post] = round(sign * w * WEIGHT_SCALE, 1)

    gaps = {}
    for a, targets in gap.items():
        for b, w in targets.items():
            if a != b and is_neuron(a) and is_neuron(b):
                gaps.setdefault(a, {})[b] = round(w * WEIGHT_SCALE, 1)

    header = (
        "/* Generated by tools/build_connectome.py. Do not edit by hand.\n"
        " * Adult hermaphrodite connectome from Cook et al. (2019), with synapse signs predicted by\n"
        " * Fenyves et al. (2020) and tyramine inhibition from RIM (Pirri et al., 2009). Synapses whose\n"
        " * sign could not be predicted are left out.\n"
        " * See the script for how each sign is chosen.\n"
        " */\n\n"
    )
    with open(out_path, "w", newline="\n") as f:
        f.write(header)
        f.write(to_js("weights", weights, "Chemical synapses: weights[pre][post], negative where inhibitory"))
        f.write("\n\n")
        f.write(to_js("gapJunctions", gaps, "Gap junctions: gapJunctions[a][b], listed in both directions"))
        f.write("\n")

    n_chem = sum(len(t) for t in weights.values())
    n_inh = sum(1 for t in weights.values() for w in t.values() if w < 0)
    n_gap = sum(len(t) for t in gaps.values()) // 2
    print("neurons with output: %d" % len(weights))
    print("chemical synapses: %d (%d inhibitory), gap junction pairs: %d" % (n_chem, n_inh, n_gap))
    print("sign sources:", counts)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    here = os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else os.path.join(here, "..", "js", "constants.js"))
