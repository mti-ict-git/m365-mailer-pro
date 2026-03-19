FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN npm --prefix backend install --omit=dev

COPY backend ./backend
COPY data ./data

ENV NODE_ENV=production
EXPOSE 3001

CMD ["npm", "--prefix", "backend", "run", "start"]
