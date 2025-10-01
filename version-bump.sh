#!/bin/bash

# Este script encontra a versão atual e incrementa o último dígito (patch).

# Nome do ficheiro principal do plugin
PLUGIN_FILE="ch-booking-rules.php"

# 1. Obter a versão atual do ficheiro
CURRENT_VERSION=$(grep -m1 "Version:" $PLUGIN_FILE | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')

# Se não encontrar a versão, sai
if [ -z "$CURRENT_VERSION" ]; then
    echo "Erro: Versão não encontrada no $PLUGIN_FILE"
    exit 1
fi

# 2. Calcular a nova versão (incrementar o patch)
# Ex: 2.0.1 -> 2.0.2
MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1)
MINOR=$(echo $CURRENT_VERSION | cut -d. -f2)
PATCH=$(echo $CURRENT_VERSION | cut -d. -f3)

NEW_PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"

# 3. Substituir a versão nos ficheiros
echo "Versão atual: $CURRENT_VERSION. Aumentando para: $NEW_VERSION"

# Substituir no cabeçalho e na constante VER
sed -i '' "s/Version: $CURRENT_VERSION/Version: $NEW_VERSION/g" $PLUGIN_FILE
sed -i '' "s/const VER = '$CURRENT_VERSION'/const VER = '$NEW_VERSION'/g" $PLUGIN_FILE

# 4. Adicionar os ficheiros alterados ao commit atual
git add $PLUGIN_FILE
echo "$PLUGIN_FILE atualizado para $NEW_VERSION e adicionado ao commit."

# Opcional: Adicionar a data ao Changelog (Mais complexo, mas possível!)
# Por agora, deixe o Changelog manual para garantir a descrição correta.

exit 0