FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Cambiar dev a start para producción. (dev es para ver cambios instantaneamente sin tener que reiniciar el contenedor docker)
CMD ["node", "server.js"]