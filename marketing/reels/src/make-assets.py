# Embeds the exported Gel Labeler figure for the pixel art layer (SVG-as-image cannot load files).
import base64
open('assets.js', 'w').write("window.ASSETS={export:'data:image/png;base64," + base64.b64encode(open('cap/export.png', 'rb').read()).decode() + "'};")
