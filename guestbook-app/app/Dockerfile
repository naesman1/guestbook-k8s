# app/Dockerfile
# ----------------------------------------------------------------------------------------------------
# Etapa de Construcción (Builder Stage):
# Usa una imagen base de Node.js ligera para construir tu aplicación.
FROM node:18-alpine AS builder 
                               #     'AS builder' es crucial para nombrar esta etapa.

# Establece el directorio de trabajo dentro del contenedor.
WORKDIR /app

# Copia los archivos package.json y package-lock.json (o yarn.lock) primero.
COPY package.json ./

# Instala las dependencias de Node.js.
RUN npm install --omit=dev

# Copia el resto del código fuente de la aplicación.
COPY . .

# ----------------------------------------------------------------------------------------------------
# Etapa de Producción (Production Stage):
# Usa una imagen base aún más ligera para la aplicación final.
FROM node:18-alpine
                    #     La segunda etapa DEBE empezar desde una imagen base.

# Establece el directorio de trabajo.
WORKDIR /app

# Copia los node_modules instalados desde la etapa de construcción 'builder'.
COPY --from=builder /app/node_modules ./node_modules

# Copia el código fuente de la aplicación desde la etapa de construcción 'builder'.
COPY --from=builder /app/ . 

# Expone el puerto en el que la aplicación Node.js escuchará.
EXPOSE 3000

# Define el comando que se ejecutará cuando el contenedor se inicie.
CMD ["npm", "start"]