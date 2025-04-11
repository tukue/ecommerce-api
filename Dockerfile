# Use the official Node.js image with a specific version for stability
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code to the working directory
COPY . .

# Expose the application port
EXPOSE 5004

# Start the application
CMD ["node", "server.js"]