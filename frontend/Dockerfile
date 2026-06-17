FROM node:20-slim AS build
WORKDIR /app

# Build-time configuration for the browser bundle (Vite inlines VITE_* envs).
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ARG VITE_KEYCLOAK_REALM=elastalert
ARG VITE_KEYCLOAK_CLIENT=elastalert-web
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT=$VITE_KEYCLOAK_CLIENT

COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
