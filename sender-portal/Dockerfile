FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY sender-portal/package.json ./sender-portal/package.json
COPY shared/package.json ./shared/package.json
RUN npm ci

COPY shared ./shared
COPY sender-portal ./sender-portal

WORKDIR /app/sender-portal

ARG VITE_API_URL=http://localhost
ARG VITE_SOCKET_URL=http://localhost
ARG VITE_MMI_KEY=
ARG VITE_RAZORPAY_KEY_ID=
ARG VITE_POSTHOG_KEY=
ARG VITE_POSTHOG_HOST=
ARG VITE_SENTRY_DSN=
ARG VITE_APP_ENV=production
ARG VITE_RELEASE=local
ARG VITE_ANALYTICS_DEBUG=false
ARG VITE_DEMO_MODE=true

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_MMI_KEY=$VITE_MMI_KEY
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID
ENV VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY
ENV VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_RELEASE=$VITE_RELEASE
ENV VITE_ANALYTICS_DEBUG=$VITE_ANALYTICS_DEBUG
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE

RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx/sender-portal.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/sender-portal/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1/ || exit 1
