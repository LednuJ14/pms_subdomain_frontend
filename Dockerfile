# Step 1: Build React (Vite)
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Set API base URLs for production build
ARG VITE_API_BASE_URL=https://admin.pms.api.vicirotechnologies.com/api
ARG VITE_PROPERTY_API_BASE_URL=https://admin.pms.api.vicirotechnologies.com/api
ARG VITE_MAIN_DOMAIN_API_URL=https://admin.pms.api.vicirotechnologies.com/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PROPERTY_API_BASE_URL=$VITE_PROPERTY_API_BASE_URL
ENV VITE_MAIN_DOMAIN_API_URL=$VITE_MAIN_DOMAIN_API_URL

RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:alpine

# Clean default Nginx HTML
RUN rm -rf /usr/share/nginx/html/*

# Use custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite build output
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
