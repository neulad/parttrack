FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Run migrations, seed, then start
CMD ["sh", "-c", "npm run migrate && node seeds/index.js && npm start"]
