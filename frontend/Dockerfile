FROM node:18
WORKDIR /app
COPY package.json package-lock.json ./

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]