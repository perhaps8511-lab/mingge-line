FROM node:24-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix backend --omit=dev --ignore-scripts
COPY backend/src/w1 ./backend/src/w1
COPY backend/public ./backend/public
COPY backend/w1-migrations ./backend/w1-migrations
COPY backend/data/classics-candidate.json ./backend/data/classics-candidate.json
COPY backend/scripts/w1-migrate.mjs ./backend/scripts/w1-migrate.mjs
COPY prompts/jiegua ./prompts/jiegua
COPY W1_BUILD.json ./W1_BUILD.json
USER node
EXPOSE 8080
CMD ["node", "backend/src/w1/start.js"]
