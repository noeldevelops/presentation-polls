FROM node:18-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production
COPY backend ./
COPY public ../public
EXPOSE 3000
CMD ["node", "server.js"] 