FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV FAIL_ON_START=false

COPY package.json ./
COPY app.js ./

EXPOSE 3000

CMD ["node", "app.js"]
