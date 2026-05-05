process.env.HOSTNAME = '0.0.0.0';
process.env.PORT = process.env.PORT || '8080';

await import('./.next/standalone/server.js');
