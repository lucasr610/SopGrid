# SOPGRID Standalone Deployment Guide

This guide provides instructions for deploying SOPGRID outside of Replit on various platforms.

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL database (or use Docker Compose with included PostgreSQL)
- Required API keys (OpenAI, Anthropic, Gemini, Qdrant, etc.)

## Quick Start

### Option 1: Direct Node.js Deployment

1. **Clone or download the repository**
   ```bash
   git clone <your-repo-url>
   cd sopgrid
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual configuration values
   nano .env  # or use your preferred editor
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Run database migrations**
   ```bash
   npm run db:push
   ```

5. **Start the application**
   
   **Linux/Mac:**
   ```bash
   chmod +x start-standalone.sh
   ./start-standalone.sh
   ```
   
   **Windows:**
   ```cmd
   start-standalone.cmd
   ```

### Option 2: Docker Deployment

1. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

   This will:
   - Build the SOPGRID application
   - Start a PostgreSQL database
   - Configure all networking automatically

3. **Access the application**
   ```
   http://localhost:5000
   ```

### Option 3: Production Linux Server (systemd)

1. **Create application user**
   ```bash
   sudo useradd -r -s /bin/false sopgrid
   sudo mkdir -p /opt/sopgrid /var/log/sopgrid
   ```

2. **Copy application files**
   ```bash
   sudo cp -r . /opt/sopgrid/
   sudo chown -R sopgrid:sopgrid /opt/sopgrid /var/log/sopgrid
   ```

3. **Set up environment**
   ```bash
   sudo cp .env.example /opt/sopgrid/.env
   sudo nano /opt/sopgrid/.env  # Configure with production values
   sudo chmod 600 /opt/sopgrid/.env
   ```

4. **Install systemd service**
   ```bash
   sudo cp sopgrid.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable sopgrid
   sudo systemctl start sopgrid
   ```

5. **Check service status**
   ```bash
   sudo systemctl status sopgrid
   sudo journalctl -u sopgrid -f  # View logs
   ```

## Environment Variables

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for GPT-4o
- `ANTHROPIC_API_KEY`: Anthropic API key (optional but recommended)
- `GEMINI_API_KEY`: Google Gemini API key
- `SESSION_SECRET`: Secure random string for session encryption

### Optional Variables

- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode (development/production)
- `QDRANT_URL`: Qdrant vector database URL
- `QDRANT_API_KEY`: Qdrant API key
- `MONGO_URI`: MongoDB connection string (for document storage)
- `RVPARTFINDER_*`: RV Part Finder API credentials

## Security Considerations

1. **Never commit `.env` files** with real credentials to version control
2. **Use strong, unique passwords** for all services
3. **Enable SSL/TLS** for production deployments
4. **Restrict database access** to application servers only
5. **Regularly update dependencies** with `npm audit fix`
6. **Use a reverse proxy** (nginx/Apache) for production
7. **Enable firewall rules** to restrict access

## Nginx Reverse Proxy Configuration

For production deployments, use nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000  # Linux/Mac
netstat -ano | findstr :5000  # Windows

# Kill the process or change PORT in .env
```

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure SSL mode matches your database configuration
- Test connection with: `psql $DATABASE_URL`

### Missing Dependencies
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Permission Errors (Linux)
```bash
# Fix file permissions
sudo chown -R $(whoami) .
chmod +x start-standalone.sh
```

## Monitoring and Logging

### Application Logs
- Development: Logs appear in terminal
- Production (systemd): `/var/log/sopgrid/sopgrid.log`
- Docker: `docker-compose logs -f sopgrid`

### Health Check Endpoint
```bash
curl http://localhost:5000/api/health
```

## Backup and Recovery

### Database Backup
```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20240101.sql
```

### Application Backup
```bash
# Backup uploads and data directories
tar -czf sopgrid_data_$(date +%Y%m%d).tar.gz data/ uploads/
```

## Performance Tuning

### Node.js Optimization
```bash
# Increase memory limit if needed
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### PostgreSQL Tuning
Edit `postgresql.conf`:
```
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
```

## Support

For issues specific to standalone deployment:
1. Check logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all required services are running
4. Test database connectivity independently

Remember: This deployment is independent of Replit. All configuration and dependencies are self-contained.