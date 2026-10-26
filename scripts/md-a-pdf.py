"""
Convierte docs/prueba-cliente.md en un PDF legible en celular.

    python scripts/md-a-pdf.py docs/prueba-cliente.md docs/prueba-cliente.pdf

Se usa para mandar las instrucciones por WhatsApp, que no entiende Markdown.

La página es A5 vertical, no carta: en la pantalla de un celular una hoja
carta se ve como una miniatura ilegible, mientras que A5 llena el ancho con
el texto a buen tamaño.
"""

import re
import sys

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

TINTA = colors.HexColor("#111827")
SUAVE = colors.HexColor("#6b7280")
ACENTO = colors.HexColor("#0369a1")
BORDE = colors.HexColor("#d1d5db")
FONDO_TABLA = colors.HexColor("#f3f4f6")

# Los emoji no existen en las fuentes base de reportlab: saldrían como
# cuadros negros. Se cambian por su nombre.
EMOJI = {
    "🟩": "verde",
    "🟧": "ámbar",
    "⬜": "gris",
    "✎": "lápiz",
    "↑": "arriba",
    "↓": "abajo",
}


def estilos():
    base = getSampleStyleSheet()
    return {
        "titulo": ParagraphStyle(
            "titulo", parent=base["Title"], fontName="Helvetica-Bold",
            fontSize=18, leading=22, textColor=TINTA, alignment=TA_LEFT,
            spaceAfter=4,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=13, leading=16, textColor=TINTA, spaceBefore=14,
            spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "h3", parent=base["Heading3"], fontName="Helvetica-Bold",
            fontSize=11, leading=14, textColor=ACENTO, spaceBefore=10,
            spaceAfter=4,
        ),
        "p": ParagraphStyle(
            "p", parent=base["BodyText"], fontName="Helvetica", fontSize=9.5,
            leading=13.5, textColor=TINTA, spaceAfter=6,
        ),
        "li": ParagraphStyle(
            "li", parent=base["BodyText"], fontName="Helvetica", fontSize=9.5,
            leading=13, textColor=TINTA, spaceAfter=2,
        ),
        "celda": ParagraphStyle(
            "celda", fontName="Helvetica", fontSize=8.5, leading=11,
            textColor=TINTA,
        ),
        "celdaEnc": ParagraphStyle(
            "celdaEnc", fontName="Helvetica-Bold", fontSize=8.5, leading=11,
            textColor=TINTA,
        ),
    }


def en_linea(texto: str) -> str:
    """Markdown de una línea a las etiquetas que entiende reportlab."""
    for emoji, palabra in EMOJI.items():
        texto = texto.replace(emoji, palabra)

    texto = texto.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    texto = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", texto)
    texto = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", texto)
    texto = re.sub(
        r"`(.+?)`",
        r'<font face="Courier" color="#0369a1">\1</font>',
        texto,
    )
    return texto


def fila_de(linea: str) -> list[str]:
    return [c.strip() for c in linea.strip().strip("|").split("|")]


def convertir(origen: str, destino: str) -> None:
    with open(origen, encoding="utf-8") as f:
        lineas = f.read().split("\n")

    est = estilos()
    historia = []
    i = 0
    vinetas: list[ListItem] = []

    def vaciar_vinetas():
        nonlocal vinetas
        if vinetas:
            historia.append(
                ListFlowable(
                    vinetas, bulletType="bullet", start="•",
                    leftIndent=12, bulletFontSize=7,
                )
            )
            historia.append(Spacer(1, 5))
            vinetas = []

    while i < len(lineas):
        linea = lineas[i]
        pelada = linea.strip()

        # Tabla: encabezado, separador y filas.
        if pelada.startswith("|") and i + 1 < len(lineas) and set(
            lineas[i + 1].strip().replace("|", "").replace(" ", "")
        ) <= {"-", ":"} and lineas[i + 1].strip().startswith("|"):
            vaciar_vinetas()
            encabezado = fila_de(pelada)
            i += 2
            filas = []
            while i < len(lineas) and lineas[i].strip().startswith("|"):
                filas.append(fila_de(lineas[i]))
                i += 1

            datos = [[Paragraph(en_linea(c), est["celdaEnc"]) for c in encabezado]]
            datos += [
                [Paragraph(en_linea(c), est["celda"]) for c in fila]
                for fila in filas
            ]

            # Si el encabezado va vacío (tablas de dos columnas sin título),
            # se omite para no dejar una franja gris sin texto.
            sin_encabezado = all(not c for c in encabezado)
            if sin_encabezado:
                datos = datos[1:]

            tabla = Table(datos, hAlign="LEFT", repeatRows=0 if sin_encabezado else 1)
            estilo = [
                ("GRID", (0, 0), (-1, -1), 0.4, BORDE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
            if not sin_encabezado:
                estilo.append(("BACKGROUND", (0, 0), (-1, 0), FONDO_TABLA))
            tabla.setStyle(TableStyle(estilo))
            historia.append(tabla)
            historia.append(Spacer(1, 9))
            continue

        if not pelada:
            vaciar_vinetas()
            i += 1
            continue

        if pelada.startswith("# "):
            vaciar_vinetas()
            historia.append(Paragraph(en_linea(pelada[2:]), est["titulo"]))
        elif pelada.startswith("## "):
            vaciar_vinetas()
            historia.append(Paragraph(en_linea(pelada[3:]), est["h2"]))
        elif pelada.startswith("### "):
            vaciar_vinetas()
            historia.append(Paragraph(en_linea(pelada[4:]), est["h3"]))
        elif pelada.startswith("---"):
            vaciar_vinetas()
            historia.append(Spacer(1, 4))
            historia.append(HRFlowable(width="100%", thickness=0.5, color=BORDE))
            historia.append(Spacer(1, 6))
        elif re.match(r"^[-*] ", pelada):
            vinetas.append(
                ListItem(Paragraph(en_linea(pelada[2:]), est["li"]), leftIndent=12)
            )
        elif re.match(r"^\d+\. ", pelada):
            vaciar_vinetas()
            numero, resto = pelada.split(". ", 1)
            historia.append(
                Paragraph(
                    f"<b>{numero}.</b>&nbsp;&nbsp;{en_linea(resto)}",
                    ParagraphStyle("num", parent=est["li"], leftIndent=14,
                                   firstLineIndent=-14),
                )
            )
        else:
            # Un párrafo de Markdown puede venir repartido en varias líneas.
            # Hay que unirlas antes de convertir: si no, un **negrita** que
            # cruza el salto de línea no se reconoce y sale con asteriscos.
            vaciar_vinetas()
            partes = [pelada]
            j = i + 1
            while j < len(lineas):
                siguiente = lineas[j].strip()
                if not siguiente or re.match(
                    r"^(#{1,6} |[-*] |\d+\. |\||---)", siguiente
                ):
                    break
                partes.append(siguiente)
                j += 1
            historia.append(Paragraph(en_linea(" ".join(partes)), est["p"]))
            i = j
            continue

        i += 1

    vaciar_vinetas()

    def pie(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(SUAVE)
        canvas.drawCentredString(A5[0] / 2, 10 * mm, str(doc.page))
        canvas.restoreState()

    SimpleDocTemplate(
        destino, pagesize=A5,
        leftMargin=13 * mm, rightMargin=13 * mm,
        topMargin=14 * mm, bottomMargin=16 * mm,
        title="Prueba del sistema de calificación",
        author="Bandas de Guerra",
    ).build(historia, onFirstPage=pie, onLaterPages=pie)


if __name__ == "__main__":
    convertir(sys.argv[1], sys.argv[2])
    print(f"  PDF generado: {sys.argv[2]}")
