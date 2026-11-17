FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

CMD ["npm", "start"]
