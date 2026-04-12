FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY backend/package.json ./backend/package.json
COPY sender-portal/package.json ./sender-portal/package.json
COPY carrier-portal/package.json ./carrier-portal/package.json
COPY shared/package.json ./shared/package.json
RUN npm install

COPY shared ./shared
COPY sender-portal ./sender-portal

WORKDIR /app/sender-portal

EXPOSE 3001
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3001"]
