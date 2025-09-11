# Dockerfile pour le scraper d'arrondissements
FROM node:20-slim

# Installer les dépendances système nécessaires pour Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Créer le répertoire de travail
WORKDIR /app

# Copier les fichiers package
COPY cloud-run-package.json package.json

# Installer les dépendances Node.js
RUN npm install

# Copier le code source
COPY cloud-run-index.js ./
COPY cloud-run-package.json package.json

# Copier les credentials BigQuery
COPY ../config/bigquery-credentials.json ./

# Exposer le port
EXPOSE 8080

# Commande de démarrage
CMD ["node", "cloud-run-index.js"]
