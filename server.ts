import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { MongoClient, Db } from 'mongodb';

process.env.DISABLE_HMR = 'true';

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS headers for Tauri & Web frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

export interface MongoConfig {
  uri: string;
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: MongoConfig = {
  uri: 'mongodb://127.0.0.1:27017/clinic',
  host: '127.0.0.1',
  port: 27017,
  database: 'clinic',
  username: '',
  password: '',
  enabled: true,
};

function getConfigFilePath(): string {
  if (process.env.CONFIG_PATH) return process.env.CONFIG_PATH;
  
  const exeDir = path.dirname(process.execPath);
  const possiblePaths = [
    path.join(process.cwd(), 'mongo-config.json'),
    path.join(exeDir, 'mongo-config.json'),
    path.join(exeDir, '..', 'mongo-config.json'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  return path.join(process.cwd(), 'mongo-config.json');
}

function readMongoConfig(): MongoConfig {
  try {
    const filePath = getConfigFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Error reading config file:', e);
  }
  return DEFAULT_CONFIG;
}

function writeMongoConfig(config: MongoConfig): void {
  try {
    const filePath = getConfigFilePath();
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing config file:', e);
  }
}

function buildMongoURI(config: MongoConfig): string {
  if (config.uri && config.uri.trim() !== '') {
    return config.uri.trim();
  }
  const host = config.host || '127.0.0.1';
  const port = config.port || 27017;
  const dbName = config.database || 'clinic';

  if (config.username && config.password) {
    const user = encodeURIComponent(config.username);
    const pass = encodeURIComponent(config.password);
    return `mongodb://${user}:${pass}@${host}:${port}/${dbName}?authSource=admin`;
  }

  return `mongodb://${host}:${port}/${dbName}`;
}

async function getMongoClient(config: MongoConfig): Promise<{ client: MongoClient; db: Db }> {
  const uri = buildMongoURI(config);
  const client = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  const dbName = config.database || 'clinic';
  const db = client.db(dbName);
  return { client, db };
}

async function ensureCollectionsExist(db: Db) {
  const collections = ['patients', 'services', 'operators', 'admissions', 'followups', 'settings'];
  const existingCols = await db.listCollections().toArray();
  const existingNames = existingCols.map((c) => c.name);

  for (const colName of collections) {
    if (!existingNames.includes(colName)) {
      await db.createCollection(colName);
    }
  }

  // Create useful indexes
  await db.collection('patients').createIndex({ id: 1 }, { unique: true });
  await db.collection('services').createIndex({ id: 1 }, { unique: true });
  await db.collection('operators').createIndex({ id: 1 }, { unique: true });
  await db.collection('admissions').createIndex({ id: 1 }, { unique: true });
  await db.collection('followups').createIndex({ id: 1 }, { unique: true });
  await db.collection('settings').createIndex({ id: 1 }, { unique: true });
}

// API Routes
app.get('/api/ping', (req: Request, res: Response) => {
  res.json({ ok: true, server: 'ClinicMongoBackend', time: new Date().toISOString() });
});

app.get('/api/db/config', (req: Request, res: Response) => {
  const config = readMongoConfig();
  res.json({ success: true, config });
});

app.post('/api/db/config', (req: Request, res: Response) => {
  const newConfig = req.body as MongoConfig;
  if (!newConfig || (!newConfig.host && !newConfig.uri)) {
    res.status(400).json({ success: false, message: 'تنظیمات نامعتبر است' });
    return;
  }
  writeMongoConfig(newConfig);
  res.json({ success: true, message: 'تنظیمات MongoDB با موفقیت ذخیره شد', config: newConfig });
});

app.post('/api/db/reset-default', (req: Request, res: Response) => {
  writeMongoConfig(DEFAULT_CONFIG);
  res.json({ success: true, message: 'تنظیمات به حالت پیش‌فرض (mongodb://127.0.0.1:27017/clinic) بازنشانی شد', config: DEFAULT_CONFIG });
});

app.post('/api/db/test', async (req: Request, res: Response) => {
  const config = (req.body && (req.body.host || req.body.uri) ? req.body : readMongoConfig()) as MongoConfig;
  let client: MongoClient | null = null;

  try {
    const mongo = await getMongoClient(config);
    client = mongo.client;
    const adminDb = client.db().admin();
    const pingRes = await adminDb.ping();

    const collections = await mongo.db.listCollections().toArray();
    const versionInfo = await adminDb.serverStatus().catch(() => ({ version: 'MongoDB Server' }));

    res.json({
      success: true,
      message: `اتصال به پایگاه داده MongoDB (دیتابیس ${config.database || 'clinic'}) با موفقیت برقرار شد.`,
      version: versionInfo.version || 'MongoDB',
      databaseExists: true,
      tablesCount: collections.length,
    });
  } catch (e: any) {
    res.json({
      success: false,
      message: `خطا در اتصال به MongoDB: ${e.message || 'سرور پاسخگو نیست'}`,
    });
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
});

app.post('/api/db/init-tables', async (req: Request, res: Response) => {
  const config = (req.body && (req.body.host || req.body.uri) ? req.body : readMongoConfig()) as MongoConfig;
  let client: MongoClient | null = null;

  try {
    const mongo = await getMongoClient(config);
    client = mongo.client;
    await ensureCollectionsExist(mongo.db);

    res.json({
      success: true,
      message: `پایگاه داده '${config.database || 'clinic'}' و مجموعه‌های (Collections) مربوطه با موفقیت آماده‌سازی شدند.`,
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      message: `خطا در آماده‌سازی کلوکشن‌های MongoDB: ${e.message}`,
    });
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
});

app.get('/api/db/load', async (req: Request, res: Response) => {
  const config = readMongoConfig();
  if (!config.enabled) {
    res.json({ success: false, message: 'اتصال به MongoDB غیرفعال است' });
    return;
  }

  let client: MongoClient | null = null;
  try {
    const mongo = await getMongoClient(config);
    client = mongo.client;
    await ensureCollectionsExist(mongo.db);

    const cleanDoc = (doc: any) => {
      if (!doc) return doc;
      const { _id, ...rest } = doc;
      return rest;
    };

    const patientsDocs = await mongo.db.collection('patients').find({}).toArray();
    const patients = patientsDocs.map(cleanDoc);

    const servicesDocs = await mongo.db.collection('services').find({}).toArray();
    const services = servicesDocs.map(cleanDoc);

    const operatorsDocs = await mongo.db.collection('operators').find({}).toArray();
    const operators = operatorsDocs.map(cleanDoc);

    const admissionsDocs = await mongo.db.collection('admissions').find({}).sort({ _id: -1 }).toArray();
    const admissions = admissionsDocs.map(cleanDoc);

    const followUpsDocs = await mongo.db.collection('followups').find({}).toArray();
    const followUps = followUpsDocs.map(cleanDoc);

    const settingsDoc = await mongo.db.collection('settings').findOne({ id: 'main_settings' });
    const settings = settingsDoc ? cleanDoc(settingsDoc).data || cleanDoc(settingsDoc) : null;

    res.json({
      success: true,
      data: {
        patients,
        services,
        operators,
        admissions,
        followUps,
        settings,
      },
    });
  } catch (e: any) {
    res.json({ success: false, message: `خطا در بارگذاری داده‌ها از MongoDB: ${e.message}` });
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
});

app.post('/api/db/sync', async (req: Request, res: Response) => {
  const config = readMongoConfig();
  if (!config.enabled) {
    res.json({ success: false, message: 'اتصال به MongoDB غیرفعال است' });
    return;
  }

  const { patients, services, operators, admissions, followUps, settings } = req.body || {};
  let client: MongoClient | null = null;

  try {
    const mongo = await getMongoClient(config);
    client = mongo.client;
    await ensureCollectionsExist(mongo.db);

    if (Array.isArray(patients)) {
      for (const p of patients) {
        if (!p.id) continue;
        await mongo.db.collection('patients').replaceOne({ id: p.id }, p, { upsert: true });
      }
    }

    if (Array.isArray(services)) {
      for (const s of services) {
        if (!s.id) continue;
        await mongo.db.collection('services').replaceOne({ id: s.id }, s, { upsert: true });
      }
    }

    if (Array.isArray(operators)) {
      for (const o of operators) {
        if (!o.id) continue;
        await mongo.db.collection('operators').replaceOne({ id: o.id }, o, { upsert: true });
      }
    }

    if (Array.isArray(admissions)) {
      for (const a of admissions) {
        if (!a.id) continue;
        await mongo.db.collection('admissions').replaceOne({ id: a.id }, a, { upsert: true });
      }
    }

    if (Array.isArray(followUps)) {
      for (const f of followUps) {
        if (!f.id) continue;
        await mongo.db.collection('followups').replaceOne({ id: f.id }, f, { upsert: true });
      }
    }

    if (settings) {
      await mongo.db.collection('settings').replaceOne(
        { id: 'main_settings' },
        { id: 'main_settings', data: settings },
        { upsert: true }
      );
    }

    res.json({
      success: true,
      message: 'تمامی اطلاعات با موفقیت در کلوکشن‌های MongoDB ثبت و همگام‌سازی شدند.',
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: `خطا در ذخیره‌سازی داده‌ها در MongoDB: ${e.message}` });
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
});

app.post('/api/db/clear', async (req: Request, res: Response) => {
  const config = readMongoConfig();
  let client: MongoClient | null = null;
  try {
    const mongo = await getMongoClient(config);
    client = mongo.client;
    await mongo.db.collection('patients').deleteMany({});
    await mongo.db.collection('admissions').deleteMany({});
    await mongo.db.collection('followups').deleteMany({});
    res.json({ success: true, message: 'مجموعه‌های اطلاعاتی در MongoDB با موفقیت پاکسازی شدند.' });
  } catch (e: any) {
    res.json({ success: false, message: e.message });
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
});

async function setupApp() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Vite development server middleware skipped:', err);
    }
  }

  app.listen(PORT, () => {
    console.log(`[ClinicMongoBackend] Express + MongoDB Server running on http://127.0.0.1:${PORT}`);
  });
}

setupApp();
