import os
import hashlib

# Папки для сканирования (должны соответствовать настройкам лаунчера)
FOLDERS_TO_SYNC = ["mods", "kubejs", "datapacks", "resourcepacks", "config"]

def calculate_sha256(filepath):
    hasher = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            while chunk := f.read(8192):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        print(f"Ошибка при вычислении хэша для {filepath}: {e}")
        return None

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    index_path = os.path.join(base_dir, "index.toml")
    pack_path = os.path.join(base_dir, "pack.toml")
    
    print("=== ИНДЕКСАЦИЯ СБОРКИ ДЛЯ ЛАУНЧЕРА ===")
    
    files_indexed = []
    
    for folder in FOLDERS_TO_SYNC:
        folder_path = os.path.join(base_dir, folder)
        if not os.path.exists(folder_path):
            continue
            
        print(f"Сканирование папки: {folder}...")
        for root, _, files in os.walk(folder_path):
            for file in files:
                # Игнорируем временные файлы и скрытые файлы гита/системы
                if file.startswith('.') or file.endswith('.tmp'):
                    continue
                    
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_dir).replace(os.sep, '/')
                
                # Вычисляем хэш
                file_hash = calculate_sha256(full_path)
                if file_hash:
                    files_indexed.append((rel_path, file_hash))
                    
    # Сортируем для красоты
    files_indexed.sort(key=lambda x: x[0])
    
    # 1. Запись index.toml
    print(f"Запись {index_path}...")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write('hash-format = "sha256"\n\n')
        for path, file_hash in files_indexed:
            f.write('[[files]]\n')
            f.write(f'path = "{path}"\n')
            f.write(f'hash = "{file_hash}"\n\n')
            
    # Чтение существующей версии лаунчера из pack.toml для сохранения значения
    import re
    launcher_version = "1.0"
    if os.path.exists(pack_path):
        try:
            with open(pack_path, "r", encoding="utf-8") as f:
                pack_content = f.read()
            match = re.search(r'launcher_version\s*=\s*"([^"]+)"', pack_content)
            if match:
                launcher_version = match.group(1)
        except:
            pass

    # 2. Запись pack.toml
    print(f"Запись {pack_path}...")
    with open(pack_path, "w", encoding="utf-8") as f:
        f.write('name = "RPG Minecraft Modpack"\n')
        f.write('author = "maximyka"\n')
        f.write('version = "1.0"\n')
        f.write(f'launcher_version = "{launcher_version}"\n\n')
        f.write('[versions]\n')
        f.write('minecraft = "1.20.1"\n')
        f.write('forge = "47.4.20"\n\n')
        f.write('[index]\n')
        f.write('file = "index.toml"\n')
        f.write('hash-format = "sha256"\n')
        
    print(f"\n[УСПЕШНО] Индексация завершена. Индексировано файлов: {len(files_indexed)}")
    print("Не забудьте закоммитить и сделать push изменений на GitHub!")

if __name__ == "__main__":
    main()
