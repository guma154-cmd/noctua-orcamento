# Use uma imagem leve baseada em Debian para melhor compatibilidade com sqlite3 e sharp
FROM node:20-slim

# Instala dependências nativas necessárias para compilação de módulos (sqlite3/sharp)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia manifestos de dependências do subdiretório 'app'
COPY app/package*.json ./

# Instala dependências de produção
RUN npm install --omit=dev

# Copia o código da aplicação do subdiretório 'app'
COPY app/ ./

# Garante a existência da pasta de dados para o SQLite
RUN mkdir -p /app/data

# Define variáveis de ambiente padrão
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/database.sqlite

# O bot utiliza Polling, então não há necessidade de EXPOSE
CMD ["npm", "start"]
