FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@9.15.4

COPY . .

RUN pnpm install
RUN pnpm --filter @threat-telemetry/shared build
RUN pnpm --filter @threat-telemetry/web build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Replace default nginx config with one that routes all requests to index.html
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://api:8080/api/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
