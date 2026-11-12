"""Gera os arquivos editáveis e SVG de arquitetura a partir de um único layout.
PNG: render_architecture.ts usa as dependências e fontes locais do projeto.

Uso: python3 docs/diagrams/build_architecture.py
"""

import json
from pathlib import Path

LABELS = {
    "pt": {
        "zone_out": "CarouKit / preparação local / agente opcional",
        "zone_in": "Container sem rede (--network none, somente leitura)",
        "zone_res": "Pasta de saída gravável",
        "source": "Conteúdo preparado\npelo usuário",
        "author": "Você ou agente\nexterno opcional",
        "slides": "slides.json\nconteúdo + tema",
        "preset": "Preset de saída\nCLI / dimensões",
        "validate": "validate\nestrutura, limites\ne regras técnicas",
        "render": "render\nSatori (SVG)\nresvg (PNG)",
        "pdf": "pdf\nmonta o carrossel",
        "out": "out/\nPNGs + carousel.pdf",
        "fail": "Entrada inválida:\nreprova, sem PDF",
                "a_ok": "ok",
        "a_err": "erro",
    },
    "en": {
        "zone_out": "CarouKit / local preparation / optional agent",
        "zone_in": "Container with no network (--network none, read-only)",
        "zone_res": "Writable output folder",
        "source": "User-provided\nprepared content",
        "author": "You or an optional\nexternal agent",
        "slides": "slides.json\ncontent + theme",
        "preset": "Output preset\nCLI / dimensions",
        "validate": "validate\nstructure, limits\nand technical rules",
        "render": "render\nSatori (SVG)\nresvg (PNG)",
        "pdf": "pdf\nbuilds the carousel",
        "out": "out/\nPNGs + carousel.pdf",
        "fail": "Invalid input:\nrejected, no PDF",
                "a_ok": "ok",
        "a_err": "error",
    },
}

DARK = "#1e1e1e"
BLUE, GREEN, YELLOW, RED, CYAN = "#a5d8ff", "#b2f2bb", "#ffd43b", "#ffc9c9", "#96f2d7"

# id: (x, y, w, h, cor)
BOXES = {
    "preset": (740, 300, 260, 100, CYAN),
    "source": (80, 100, 240, 100, BLUE),
    "author": (420, 100, 240, 100, BLUE),
    "slides": (420, 300, 300, 100, YELLOW),
    "validate": (240, 600, 660, 100, GREEN),
    "fail": (80, 780, 260, 90, RED),
    "render": (420, 780, 240, 100, GREEN),
    "pdf": (740, 780, 240, 100, GREEN),
    "out": (1100, 780, 260, 100, CYAN),
}

# (id, x, y, w, h, contorno, fundo, título embaixo)
ZONES = [
    ("zone_out", 40, 40, 1000, 420, "#4c6ef5", "#dbe4ff", False),
    ("zone_in", 40, 520, 1000, 440, "#2f9e44", "#d3f9d8", True),
    ("zone_res", 1060, 700, 340, 260, "#0c8599", "#c5f6fa", True),
]

# (id, de, para, ponto de saída, ponto de chegada, rótulo, tracejada)
ARROWS = [
    ("a_preset", "preset", "validate", (870, 400), (870, 600), None, False),
    ("a1", "source", "author", (320, 150), (420, 150), None, False),
    ("a3", "author", "slides", (540, 200), (570, 300), None, False),
    ("a5", "slides", "validate", (570, 400), (570, 600), None, False),
    ("a6", "validate", "fail", (300, 700), (210, 780), "a_err", True),
    ("a7", "validate", "render", (540, 700), (540, 780), "a_ok", False),
    ("a8", "render", "pdf", (660, 830), (740, 830), None, False),
    ("a9", "pdf", "out", (980, 830), (1100, 830), None, False),
]

INDEX_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def base(eid, etype, x, y, w, h, n):
    return {
        "id": eid, "type": etype, "x": x, "y": y, "width": w, "height": h,
        "angle": 0, "strokeColor": DARK, "backgroundColor": "transparent",
        "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid",
        "roughness": 1, "opacity": 100, "groupIds": [], "frameId": None,
        "index": "a" + INDEX_CHARS[n], "roundness": {"type": 3},
        "seed": 1000 + n * 7919, "version": 1, "versionNonce": 2000 + n * 104729,
        "isDeleted": False, "boundElements": [], "updated": 1760486400000,
        "link": None, "locked": False,
    }


def text(eid, x, y, w, h, value, size, n, container=None, align="center"):
    t = base(eid, "text", x, y, w, h, n)
    t.update({
        "strokeColor": DARK, "roundness": None, "text": value,
        "originalText": value, "fontSize": size, "fontFamily": 5,
        "textAlign": align, "verticalAlign": "middle" if container else "top",
        "containerId": container, "lineHeight": 1.25, "autoResize": True,
    })
    return t


def build(lang):
    L = LABELS[lang]
    shapes, arrows, texts = [], [], []
    n = 0

    for zid, x, y, w, h, stroke, fill, _ in ZONES:
        z = base(zid, "rectangle", x, y, w, h, n)
        z.update({"strokeColor": stroke, "backgroundColor": fill, "strokeWidth": 1,
                  "strokeStyle": "dashed", "roughness": 0, "opacity": 35})
        shapes.append(z)
        n += 1

    by_id = {}
    for bid, (x, y, w, h, color) in BOXES.items():
        b = base(bid, "rectangle", x, y, w, h, n)
        b["backgroundColor"] = color
        b["boundElements"] = [{"type": "text", "id": f"t-{bid}"}]
        shapes.append(b)
        by_id[bid] = b
        n += 1

    for aid, src, dst, (sx, sy), (dx, dy), label, dashed in ARROWS:
        a = base(aid, "arrow", sx, sy, abs(dx - sx), abs(dy - sy), n)
        a.update({
            "roundness": {"type": 2}, "points": [[0, 0], [dx - sx, dy - sy]],
            "lastCommittedPoint": None, "startArrowhead": None, "endArrowhead": "arrow",
            "startBinding": {"elementId": src, "focus": 0, "gap": 1},
            "endBinding": {"elementId": dst, "focus": 0, "gap": 1},
            "strokeStyle": "dashed" if dashed else "solid",
        })
        if label:
            a["boundElements"] = [{"type": "text", "id": f"t-{aid}"}]
        by_id[src]["boundElements"].append({"type": "arrow", "id": aid})
        by_id[dst]["boundElements"].append({"type": "arrow", "id": aid})
        arrows.append((a, label))
        n += 1

    for zid, x, y, w, h, stroke, _, bottom in ZONES:
        ty = y + h - 40 if bottom else y + 12
        t = text(f"t-{zid}", x + 20, ty, w - 40, 28, L[zid], 22, n, align="left")
        t["strokeColor"] = stroke
        texts.append(t)
        n += 1

    for bid, (x, y, w, h, _) in BOXES.items():
        value = L[bid]
        lines = value.count("\n") + 1
        th = lines * 20 * 1.25
        texts.append(text(f"t-{bid}", x + 10, y + (h - th) / 2, w - 20, th, value, 20, n, container=bid))
        n += 1

    for a, label in arrows:
        if not label:
            continue
        value = L[label]
        tw = max(40, len(value) * 9)
        mx = a["x"] + a["points"][1][0] / 2 - tw / 2
        my = a["y"] + a["points"][1][1] / 2 - 11
        texts.append(text(f"t-{a['id']}", mx, my, tw, 22, value, 16, n, container=a["id"]))
        n += 1

    elements = shapes + [a for a, _ in arrows] + texts
    return {
        "type": "excalidraw", "version": 2, "source": "https://excalidraw.com",
        "elements": elements,
        "appState": {"gridSize": 20, "viewBackgroundColor": "#ffffff"},
        "files": {},
    }



def export_formats(lang, here):
    """Keep Draw.io, its YAML outline and SVG export consistent with Excalidraw."""
    from html import escape
    import xml.etree.ElementTree as ET
    L = LABELS[lang]
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1000" viewBox="0 0 1440 1000">',
           '<rect width="1440" height="1000" fill="white"/>',
           '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#1e1e1e"/></marker></defs>']
    mx = ET.Element('mxfile', host='app.diagrams.net')
    diagram = ET.SubElement(mx, 'diagram', name='Architecture')
    graph = ET.SubElement(diagram, 'mxGraphModel', pageWidth='1440', pageHeight='1000')
    tree = ET.SubElement(graph, 'root')
    ET.SubElement(tree,'mxCell',id='0')
    ET.SubElement(tree,'mxCell',id='1',parent='0')
    def cell(eid, label, x,y,w,h,fill,stroke,style=''):
        c=ET.SubElement(tree,'mxCell',id=eid,value=label,parent='1',vertex='1',
            style=f'rounded=1;whiteSpace=wrap;html=0;fontFamily=Inter;fontSize=20;fillColor={fill};strokeColor={stroke};{style}')
        ET.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),attrib={'as':'geometry'})
    def svg_text(value,x,y,size=20,anchor='middle'):
        lines=value.splitlines()
        for i,line in enumerate(lines):
            svg.append(f'<text x="{x}" y="{y+i*25}" text-anchor="{anchor}" font-family="Inter" font-size="{size}" fill="#1e1e1e">{escape(line)}</text>')
    for zid,x,y,w,h,stroke,fill,bottom in ZONES:
        svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" fill-opacity=".35" stroke="{stroke}" stroke-dasharray="6 4"/>')
        svg_text(L[zid],x+20,y+h-20 if bottom else y+32,20,'start')
        cell(zid,L[zid],x,y,w,h,fill,stroke,'opacity=35;verticalAlign=top;align=left;spacing=16;')
    for bid,(x,y,w,h,fill) in BOXES.items():
        svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="#1e1e1e" stroke-width="2"/>')
        lines=L[bid].splitlines()
        svg_text(L[bid],x+w/2,y+h/2-(len(lines)-1)*12.5+7)
        cell(bid,L[bid],x,y,w,h,fill,DARK)
    for aid,src,dst,(sx,sy),(dx,dy),label,dashed in ARROWS:
        dash='stroke-dasharray="6 4"' if dashed else ''
        svg.append(f'<path d="M{sx},{sy} L{dx},{dy}" fill="none" stroke="#1e1e1e" stroke-width="2" marker-end="url(#arrow)" {dash}/>')
        if label: svg_text(L[label],(sx+dx)/2+30,(sy+dy)/2,16)
        c=ET.SubElement(tree,'mxCell',id=aid,parent='1',edge='1',source=src,target=dst,value=L[label] if label else '',style='endArrow=open;html=0;'+('dashed=1;' if dashed else ''))
        ET.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
    svg.append('</svg>')
    (here/f'architecture.{lang}.drawio.svg').write_text('\n'.join(svg)+'\n',encoding='utf-8')
    (here/f'architecture.{lang}.drawio').write_text(ET.tostring(mx,encoding='unicode')+'\n',encoding='utf-8')
    yaml=['meta:', '  title: "CarouKit"', 'nodes:']
    for bid in BOXES:
        yaml.extend([f'  - id: {bid}', '    label: '+json.dumps(L[bid],ensure_ascii=False)])
    yaml.append('edges:')
    for _,src,dst,*_rest in ARROWS: yaml.extend([f'  - from: {src}',f'    to: {dst}'])
    (here/f'architecture.{lang}.drawio.yaml').write_text('\n'.join(yaml)+'\n',encoding='utf-8')

if __name__ == "__main__":
    here = Path(__file__).parent
    for lang in LABELS:
        out = here / f"architecture.{lang}.excalidraw"
        out.write_text(json.dumps(build(lang), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        export_formats(lang, here)
        print(out)
