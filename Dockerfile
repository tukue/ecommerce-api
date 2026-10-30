# Use the official Node.js image with a specific version for stability
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

RUN npm install --production

COPY . .

# Make sure this matches your application port
EXPOSE 5004

CMD ["node", "server.js"]
