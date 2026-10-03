#!/usr/bin/env python3
"""Builds assets/fonts/BibleIcons.ttf, the app's icons, from Material Symbols Rounded.

The source is Google's variable icon font (Apache License 2.0), from the npm package
material-symbols (a dev dependency). Only the icons below are kept, fixed at weight 400,
grade 0 and the 24 px optical size, and each is put on its own code point from U+E000 in
the order listed, so src/components/Icon.tsx can draw one by name as a single character.
A name ending in "_fill" is the filled form of the icon.

    pip install fonttools brotli
    python3 scripts/make-icon-font.py
"""
import json
import os
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'node_modules', 'material-symbols', 'material-symbols-rounded.woff2')
FONT_OUT = os.path.join(ROOT, 'assets', 'fonts', 'BibleIcons.ttf')
CODES_OUT = os.path.join(ROOT, 'src', 'iconCodes.json')
FAMILY = 'BibleIcons'

# Append new icons at the end, so existing code points stay the same.
ICONS = [
    'arrow_back', 'arrow_forward', 'arrow_drop_down', 'close', 'search', 'settings', 'swap_horiz',
    'content_copy', 'share', 'bookmark', 'bookmark_fill', 'bookmark_add', 'bookmarks', 'edit_note',
    'check', 'format_color_reset', 'compare_arrows', 'translate', 'expand_less', 'expand_more',
    'chevron_right', 'delete', 'history', 'menu_book', 'sticky_note_2', 'info', 'text_increase',
    'text_decrease', 'add', 'remove',
]


def main():
    if not os.path.exists(SOURCE):
        sys.exit(f'missing {SOURCE}; run npm install first')
    font = TTFont(SOURCE)
    font = instancer.instantiateVariableFont(font, {'FILL': 0, 'wght': 400, 'GRAD': 0, 'opsz': 24})
    order = set(font.getGlyphOrder())
    glyphs = []
    for name in ICONS:
        glyph = name[:-5] + '.fill' if name.endswith('_fill') else name
        if glyph not in order:
            sys.exit(f'no glyph {glyph} in the source font')
        glyphs.append(glyph)

    options = subset.Options()
    options.layout_features = []
    options.name_IDs = ['*']
    options.notdef_outline = True
    options.recalc_bounds = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(glyphs=glyphs)
    subsetter.subset(font)

    codes = {}
    cmap = {}
    for i, (name, glyph) in enumerate(zip(ICONS, glyphs)):
        codes[name] = 0xE000 + i
        cmap[0xE000 + i] = glyph
    for table in font['cmap'].tables:
        table.cmap = dict(cmap) if table.isUnicode() else {}
    font['cmap'].tables = [t for t in font['cmap'].tables if t.isUnicode()]
    for table in ('GSUB', 'GPOS', 'GDEF'):
        if table in font:
            del font[table]

    # Android finds a font by its file name; give the name table the same family.
    for record in font['name'].names:
        if record.nameID in (1, 16):
            record.string = FAMILY
        elif record.nameID in (4,):
            record.string = FAMILY
        elif record.nameID == 6:
            record.string = FAMILY
    os.makedirs(os.path.dirname(FONT_OUT), exist_ok=True)
    font.flavor = None
    font.save(FONT_OUT)
    with open(CODES_OUT, 'w') as f:
        json.dump(codes, f, indent=1)
        f.write('\n')
    print(f'{len(ICONS)} icons, {os.path.getsize(FONT_OUT)} bytes -> {FONT_OUT}')


if __name__ == '__main__':
    main()
