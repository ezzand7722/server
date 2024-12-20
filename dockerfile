FROM debian:bullseye-slim

# Install LibreOffice and Node.js dependencies
RUN apt-get update && apt-get install -y libreoffice && apt-get clean

# Set the working directory
WORKDIR /usr/src/app

# Copy application files
COPY . .

# Install Node.js dependencies
RUN npm install

# Expose the port your app runs on
EXPOSE 3000

# Command to run your application
CMD ["node", "server.js"]
