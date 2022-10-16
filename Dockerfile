FROM node:16-alpine
WORKDIR /usr/app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY src ./src
COPY tsconfig.json .
RUN npm run build

FROM node:16-alpine
WORKDIR /usr/app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --from=0 /usr/app/dist .
COPY ecosystem.config.js .
RUN npm install pm2 -g
CMD ["pm2-runtime", "ecosystem.config.cjs", "--env", "production"]
