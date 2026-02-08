# 1. Usamos una versión ligera de Node.js sobre Linux Alpine
FROM node:20-alpine

# 2. Creamos la carpeta donde vivirá el código dentro del contenedor
WORKDIR /app

# 3. Copiamos los archivos de configuración de dependencias primero
COPY package*.json ./

# 4. Instalamos las librerías (Express) dentro de la imagen
RUN npm install

# 5. Copiamos el resto de tu código (index.js y la carpeta public)
COPY . .

# 6. Exponemos el puerto que usa Express
EXPOSE 3000

# 7. El comando para arrancar tu Hola Mundo
CMD ["node", "server.js"]