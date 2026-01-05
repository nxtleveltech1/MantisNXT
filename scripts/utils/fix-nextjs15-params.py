#!/usr/bin/env python3
"""
Fix Next.js 15 API Route Handler Params

Updates all API route handlers to use the new Next.js 15 signature where
params is a Promise that must be awaited.
"""

import os
import re

def fix_route_file(filepath):
    """Fix a single route file to use Next.js 15 params signature."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Pattern to match route handlers with params
    # Matches: export async function GET(request: NextRequest, { params }: { params: { id: string } })
    pattern = r'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*request:\s*NextRequest,\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{([^}]+)\}\s*\}\s*\)'

    def replace_handler(match):
        method = match.group(1)
        params_content = match.group(2).strip()

        # Extract parameter names
        param_names = []
        for param in params_content.split(','):
            param = param.strip()
            if ':' in param:
                name = param.split(':')[0].strip()
                param_names.append(name)

        # Build new signature
        new_signature = f'export async function {method}(\n  request: NextRequest,\n  context: {{ params: Promise<{{ {params_content} }}> }}\n)'

        return new_signature

    # Replace all handler signatures
    content = re.sub(pattern, replace_handler, content)

    # Now we need to add await context.params at the start of each handler
    # Find each handler function body and add the await
    def add_await_params(match):
        method = match.group(1)
        params_content = match.group(2).strip()
        rest_of_function = match.group(3)

        # Extract parameter names
        param_names = []
        for param in params_content.split(','):
            param = param.strip()
            if ':' in param:
                name = param.split(':')[0].strip()
                param_names.append(name)

        # Build destructuring line
        if len(param_names) == 1:
            destruct_line = f'const {{ {param_names[0]} }} = await context.params;'
        else:
            destruct_line = f'const {{ {", ".join(param_names)} }} = await context.params;'

        # Insert after the opening brace and try block
        if 'try {' in rest_of_function[:50]:
            # Insert after try {
            parts = rest_of_function.split('try {', 1)
            new_rest = f'try {{\n    {destruct_line}\n{parts[1]}'
        else:
            # Insert at start of function
            new_rest = f'\n    {destruct_line}\n{rest_of_function}'

        return f'export async function {method}(\n  request: NextRequest,\n  context: {{ params: Promise<{{ {params_content} }}> }}\n){new_rest}'

    # Pattern to match the full function including body start
    full_pattern = r'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(\s*request:\s*NextRequest,\s*context:\s*\{\s*params:\s*Promise<\{([^}]+)\}>\s*\}\s*\)(\s*\{[^]*?(?=\n\s*export|\Z))'

    content = re.sub(full_pattern, add_await_params, content, flags=re.MULTILINE)

    # Replace old params.paramName with just paramName
    # This is trickier - we need to find uses of params.X where X is a param name
    for param_match in re.finditer(r'\{([^}]+)\}', params_content):
        params_str = param_match.group(1)
        for param in params_str.split(','):
            param = param.strip()
            if ':' in param:
                name = param.split(':')[0].strip()
                # Replace params.name with just name (but not in the signature)
                content = re.sub(rf'params\.{name}\b', name, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """Find and fix all route files with dynamic params."""
    fixed_count = 0

    for root, dirs, files in os.walk('src/app/api/v1'):
        for file in files:
            if file == 'route.ts' and '[' in root:
                filepath = os.path.join(root, file)
                print(f'Processing: {filepath}')
                if fix_route_file(filepath):
                    fixed_count += 1
                    print(f'  ✓ Fixed')
                else:
                    print(f'  - No changes needed')

    # Also check the old ai/tasks route
    old_ai_route = 'src/app/api/ai/tasks/[taskId]/route.ts'
    if os.path.exists(old_ai_route):
        print(f'Processing: {old_ai_route}')
        if fix_route_file(old_ai_route):
            fixed_count += 1
            print(f'  ✓ Fixed')

    print(f'\n✓ Fixed {fixed_count} files')

if __name__ == '__main__':
    main()
