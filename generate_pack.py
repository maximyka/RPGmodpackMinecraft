import os
import hashlib

# Настройки вашего модпака
PACK_NAME = "MyCustomSkillsPack"
AUTHOR = "Developer"
VERSION = "1.0.0"
MC_VERSION = "1.20.1"

# Папки, которые будут автоматически синхронизироваться у игроков
FOLDERS_TO_SYNC = ["mods", "kubejs", "datapacks", "resourcepacks", "config"]

def get_sha256(filepath):
    """Вычисляет SHA256 хэш файла."""
    hasher = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            while chunk := f.read(8192):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        print(f"[!] Ошибка при хешировании {filepath}: {e}")
        return None

def generate_packwiz_files():
    print("=" * 60)
    print("    ГЕНЕРАЦИЯ ФАЙЛОВ СИНХРОНИЗАЦИИ (БЕЗ PACKWIZ.EXE)    ")
    print("=" * 60)

    files_list = []

    # Сканируем указанные папки
    for folder in FOLDERS_TO_SYNC:
        if not os.path.exists(folder):
            continue
        print(f"[*] Сканирование папки: {folder}...")
        for root, _, files in os.walk(folder):
            for file in files:
                # Пропускаем временные или системные файлы
                if file.startswith(".") or file == "desktop.ini":
                    continue
                
                full_path = os.path.join(root, file)
                # Преобразуем путь в относительный с прямыми слэшами (для совместимости с Linux/Minecraft)
                rel_path = os.path.relpath(full_path, ".").replace("\\", "/")
                
                file_hash = get_sha256(full_path)
                if file_hash:
                    files_list.append({
                        "path": rel_path,
                        "hash": file_hash
                    })

    if not files_list:
        print("[!] Ошибка: Не найдено файлов для синхронизации в указанных папках!")
        return

    # 1. Генерируем index.toml
    index_content = "hash-format = \"sha256\"\n\n"
    for f in files_list:
        index_content += "[[files]]\n"
        index_content += f"path = \"{f['path']}\"\n"
        index_content += f"hash = \"{f['hash']}\"\n\n"

    index_filename = "index.toml"
    with open(index_filename, "w", encoding="utf-8") as f:
        f.write(index_content)
    print(f"[+] Создан файл: {index_filename} (проиндексировано файлов: {len(files_list)})")

    # Вычисляем хэш самого файла index.toml для pack.toml
    index_hash = hashlib.sha256(index_content.encode('utf-8')).hexdigest()

    # 2. Генерируем pack.toml
    pack_content = f"""name = "{PACK_NAME}"
author = "{AUTHOR}"
version = "{VERSION}"
pack-format = "packwiz:v1"

[index]
file = "index.toml"
hash-format = "sha256"
hash = "{index_hash}"

[versions]
minecraft = "{MC_VERSION}"
"""
    pack_filename = "pack.toml"
    with open(pack_filename, "w", encoding="utf-8") as f:
        f.write(pack_content)
    print(f"[+] Создан файл: {pack_filename}")
    print("=" * 60)
    print("[УСПЕХ] Файлы синхронизации успешно сгенерированы!")
    print("=" * 60)

if __name__ == "__main__":
    generate_packwiz_files()