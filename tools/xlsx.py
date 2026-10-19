"""Minimal .xlsx reader using only the standard library (values only, no formatting)."""
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
REL_NS = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def col_index(ref):
    letters = re.match(r"[A-Z]+", ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1


class Workbook:
    def __init__(self, path):
        self.z = zipfile.ZipFile(path)
        self.shared = []
        if "xl/sharedStrings.xml" in self.z.namelist():
            root = ET.fromstring(self.z.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                self.shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
        wb = ET.fromstring(self.z.read("xl/workbook.xml"))
        rels = ET.fromstring(self.z.read("xl/_rels/workbook.xml.rels"))
        targets = {r.get("Id"): r.get("Target") for r in rels.findall(REL_NS + "Relationship")}
        self.sheets = {}
        for s in wb.find("m:sheets", NS):
            rid = s.get("{%s}id" % NS["r"])
            target = targets[rid].lstrip("/")
            if not target.startswith("xl/"):
                target = "xl/" + target
            self.sheets[s.get("name")] = target

    def rows(self, name):
        """Returns the sheet as a list of rows (lists), with None for empty cells."""
        root = ET.fromstring(self.z.read(self.sheets[name]))
        out = []
        for row in root.iter("{%s}row" % NS["m"]):
            r = int(row.get("r")) - 1
            while len(out) <= r:
                out.append([])
            cells = out[r]
            for c in row.findall("m:c", NS):
                i = col_index(c.get("r"))
                v = c.find("m:v", NS)
                t = c.get("t")
                if t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                elif v is None:
                    val = None
                elif t == "s":
                    val = self.shared[int(v.text)]
                elif t in ("str", "b", "e"):
                    val = v.text
                else:
                    f = float(v.text)
                    val = int(f) if f.is_integer() else f
                while len(cells) <= i:
                    cells.append(None)
                cells[i] = val
        return out


if __name__ == "__main__":
    wb = Workbook(sys.argv[1])
    for name in wb.sheets:
        rows = wb.rows(name)
        print("==", repr(name), len(rows), "rows,", max((len(r) for r in rows), default=0), "cols")
        for r in rows[: int(sys.argv[2]) if len(sys.argv) > 2 else 4]:
            print("   ", [x for x in r[:12]])
