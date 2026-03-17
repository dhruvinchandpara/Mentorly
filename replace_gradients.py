import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Generic gradient text replacements
    content = content.replace("bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent", "text-blue-700")
    content = content.replace("bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800", "bg-blue-700")
    
    # Dashboard admin layout generic
    content = content.replace("bg-gradient-to-br from-blue-600 to-purple-600", "bg-blue-600 text-white")
    content = content.replace("bg-gradient-to-br from-blue-500 to-purple-500", "bg-blue-100 text-blue-700")
    
    # Dashboard admin page specific 
    content = content.replace("bg-gradient-to-br from-blue-400 to-purple-500", "bg-blue-100 text-blue-700")
    
    # Dashboard mentor
    content = content.replace("bg-gradient-to-br from-emerald-500 to-teal-600", "bg-emerald-600")
    content = content.replace("bg-gradient-to-br from-slate-400 to-slate-600", "bg-blue-100 text-blue-700") # past sessions images
    content = content.replace("bg-gradient-to-br from-blue-400 to-slate-600", "bg-blue-100 text-blue-700") 
    
    # Avatar gradient function rewrite using regex because whitespace can vary
    old_fn_pattern = r"const getAvatarGradient = \(name:\s*string\)\s*=>\s*\{\s*const g = \[\s*'from-blue-500 to-purple-600',\s*'from-blue-500 to-cyan-500',\s*'from-emerald-500 to-teal-500',\s*'from-amber-500 to-orange-500',\s*'from-rose-500 to-pink-500',\s*'from-violet-500 to-purple-500',\s*'from-sky-500 to-blue-500',?\s*\]\s*return g\[\(name\?\.charCodeAt\(0\)\s*\|\|\s*0\)\s*%\s*g\.length\]\s*\}"
    
    new_fn = """const getAvatarColor = (name: string) => {
        const colors = [
            'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700',
            'bg-amber-100 text-amber-700', 'bg-violet-100 text-violet-700',
            'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700'
        ]
        return colors[(name?.charCodeAt(0) || 0) % colors.length]
    }"""
    
    content = re.sub(old_fn_pattern, new_fn, content)
    
    # Replace calls
    content = re.sub(r'bg-gradient-to-[a-z]+\s*\$\{getAvatarGradient', '${getAvatarColor', content)
    content = content.replace('getAvatarGradient', 'getAvatarColor')

    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
            process_file(os.path.join(root, file))

print("Gradient replacement complete.")
