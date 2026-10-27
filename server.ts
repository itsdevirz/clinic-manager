import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import dns from 'dns';
import { MongoClient, Db } from 'mongodb';

// SMS panel settings: enter your panel credentials and sender line here.
const SMS_CONFIG = {
  enabled: true,
  username: 'YOUR_USERNAME',
  password: 'YOUR_PASSWORD',
  from: '5000',
};

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

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

function getAppDataDir(): string {
  const userHome = os.homedir();
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(userHome, 'Library', 'Application Support') : path.join(userHome, '.config'));
  const dir = path.join(appData, 'ClinicManagement');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return dir;
}

function getConfigFilePath(): string {
  if (process.env.CONFIG_PATH) return process.env.CONFIG_PATH;
  
  const appDataFile = path.join(getAppDataDir(), 'mongo-config.json');
  if (fs.existsSync(appDataFile)) return appDataFile;

  const exeDir = path.dirname(process.execPath);
  const possiblePaths = [
    path.join(process.cwd(), 'mongo-config.json'),
    path.join(exeDir, 'mongo-config.json'),
    path.join(exeDir, '..', 'mongo-config.json'),
    path.join(exeDir, 'resources', 'mongo-config.json'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  return appDataFile;
}

function readMongoConfig(): MongoConfig {
  const candidatePaths = [
    path.join(getAppDataDir(), 'mongo-config.json'),
    path.join(process.cwd(), 'mongo-config.json'),
    path.join(path.dirname(process.execPath), 'mongo-config.json'),
    path.join(path.dirname(process.execPath), 'resources', 'mongo-config.json'),
  ];

  for (const configPath of candidatePaths) {
    try {
      if (!fs.existsSync(configPath)) continue;
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<MongoConfig>;
      const database = typeof parsed.database === 'string' && parsed.database.trim()
        ? parsed.database.trim()
        : DEFAULT_CONFIG.database;
      const host = typeof parsed.host === 'string' && parsed.host.trim()
        ? parsed.host.trim()
        : DEFAULT_CONFIG.host;
      const port = Number(parsed.port) || DEFAULT_CONFIG.port;
      const uri = typeof parsed.uri === 'string' && parsed.uri.trim()
        ? parsed.uri.trim()
        : `mongodb://${host}:${port}/${database}`;
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        uri,
        host,
        port,
        database,
        username: typeof parsed.username === 'string' ? parsed.username : '',
        password: typeof parsed.password === 'string' ? parsed.password : '',
        enabled: parsed.enabled !== false,
      };
    } catch (error) {
      console.warn(`[ClinicMongoBackend] Could not read MongoDB config at ${configPath}:`, error);
    }
  }

  return { ...DEFAULT_CONFIG };
}

function writeMongoConfig(config: MongoConfig): void {
  const configPath = path.join(getAppDataDir(), 'mongo-config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (error) {
    console.error('[ClinicMongoBackend] Could not save MongoDB config:', error);
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
  const dbName = config.database || 'clinic';

  // Attempt 1: Direct connection (best for local standalone MongoDB mongod)
  try {
    const client = new MongoClient(uri, {
      connectTimeoutMS: 4000,
      serverSelectionTimeoutMS: 4000,
      directConnection: true,
      family: 4,
    });
    await client.connect();
    return { client, db: client.db(dbName) };
  } catch (err1) {
    // Attempt 2: Standard connection without directConnection (e.g. Atlas / Replica Set)
    try {
      const client = new MongoClient(uri, {
        connectTimeoutMS: 4000,
        serverSelectionTimeoutMS: 4000,
        family: 4,
      });
      await client.connect();
      return { client, db: client.db(dbName) };
    } catch (err2) {
      // Attempt 3: Swap 127.0.0.1 <-> localhost
      let fallbackUri = uri;
      if (uri.includes('127.0.0.1')) {
        fallbackUri = uri.replace('127.0.0.1', 'localhost');
      } else if (uri.includes('localhost')) {
        fallbackUri = uri.replace('localhost', '127.0.0.1');
      }

      if (fallbackUri !== uri) {
        try {
          const client = new MongoClient(fallbackUri, {
            connectTimeoutMS: 4000,
            serverSelectionTimeoutMS: 4000,
            family: 4,
          });
          await client.connect();
          return { client, db: client.db(dbName) };
        } catch (err3) {
          throw err1;
        }
      }
      throw err1;
    }
  }
}

async function ensureCollectionsExist(db: Db) {
  const collections = ['patients', 'services', 'operators', 'admissions', 'followups', 'settings', 'consumables', 'shareholders'];
  const existingCols = await db.listCollections().toArray();
  const existingNames = existingCols.map((c) => c.name);

  for (const colName of collections) {
    if (!existingNames.includes(colName)) {
      await db.createCollection(colName).catch(() => {});
    }
  }

  // Create unique indexes on id
  await db.collection('patients').createIndex({ id: 1 }, { unique: true }).catch(() => {});
  await db.collection('patients').createIndex(
    { nationalId: 1 },
    { unique: true, name: 'nationalId_unique_nonempty', partialFilterExpression: { nationalId: { $type: 'string', $gt: '' } } }
  ).catch((error) => {
    console.warn('[ClinicMongoBackend] Could not create nationalId unique index. Check for existing duplicate national IDs.', error.message);
  });
  await db.collection('services').createIndex({ id: 1 }, { unique: true }).catch(() => {});
  await db.collection('operators').createIndex({ id: 1 }, { unique: true }).catch(() => {});
  await db.collection('admissions').createIndex({ id: 1 }, { unique: true }).catch(() => {});
  await db.collection('followups').createIndex({ id: 1 }, { unique: true }).catch(() => {});
  await db.collection('settings').createIndex({ id: 1 }, { unique: true }).catch(() => {});
  await db.collection('consumables').createIndex({ name: 1 }, { unique: true }).catch(() => {});
  await db.collection('shareholders').createIndex({ id: 1 }, { unique: true }).catch(() => {});
}

// API Routes
app.post('/api/sms/appointment', async (req: Request, res: Response) => {
  const { to, patientName, date, time } = req.body || {};
  if (!SMS_CONFIG.enabled) {
    res.status(503).json({ success: false, message: 'ارسال پیامک در server.ts غیرفعال است.' });
    return;
  }
  if (SMS_CONFIG.username === 'YOUR_USERNAME' || SMS_CONFIG.password === 'YOUR_PASSWORD') {
    res.status(503).json({ success: false, message: 'اطلاعات پنل پیامک را در SMS_CONFIG فایل server.ts وارد کنید.' });
    return;
  }
  const normalizedPhone = String(to || '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  if (!/^09\d{9}$/.test(normalizedPhone) || !patientName || !date || !time) {
    res.status(400).json({ success: false, message: 'شماره همراه یا اطلاعات نوبت معتبر نیست.' });
    return;
  }
  try {
    const { createRequire } = await import('node:module');
    const require = createRequire(path.join(process.cwd(), 'package.json'));
    const Melipayamak = require('melipayamak-2');
    const client = new Melipayamak(SMS_CONFIG.username, SMS_CONFIG.password);
    const result = await client.send({
      to: normalizedPhone,
      from: SMS_CONFIG.from,
      text: `${patientName} عزیز،
نوبت مراجعه بعدی شما تاریخ ${date} و ساعت ${time} می‌باشد.
لطفاً سر تاریخ و ساعت مربوطه مراجعه فرمایید.
لغو۱۱`,
    });
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('[ClinicSMS] Send failed:', error);
    res.status(502).json({ success: false, message: error?.message || 'ارسال پیامک ناموفق بود.' });
  }
});

app.get('/api/ping', (req: Request, res: Response) => {
  res.json({ ok: true, server: 'ClinicMongoBackend', time: new Date().toISOString() });
});

app.get('/api/db/config', (req: Request, res: Response) => {
  const config = readMongoConfig();
  res.json({ success: true, config });
});

app.post('/api/db/config', (_req: Request, res: Response) => {
  res.status(403).json({
    success: false,
    message: 'تنظیمات اتصال دیتابیس توسط برنامه مدیریت می‌شود و قابل تغییر نیست.',
    config: DEFAULT_CONFIG,
  });
});

app.post('/api/db/reset-default', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'اتصال ثابت به دیتابیس clinic فعال است.',
    config: DEFAULT_CONFIG,
  });
});

app.post('/api/db/test', async (req: Request, res: Response) => {
  const config = readMongoConfig();
  let client: MongoClient | null = null;

  try {
    const mongo = await getMongoClient(config);
    client = mongo.client;

    // Create the clinic database collections automatically on first launch.
    await ensureCollectionsExist(mongo.db);
    await mongo.db.command({ ping: 1 });

    const collections = await mongo.db.listCollections().toArray();

    res.json({
      success: true,
      message: `اتصال به پایگاه داده MongoDB (دیتابیس ${config.database || 'clinic'}) با موفقیت برقرار شد.`,
      version: 'MongoDB Server',
      databaseExists: true,
      tablesCount: collections.length,
    });
  } catch (e: any) {
    console.error('[ClinicMongoBackend] MongoDB connection test failed:', e);
    res.json({
      success: false,
      message: `خطا در اتصال به MongoDB: ${e.message || 'سرویس MongoDB روی سیستم یافت نشد.'}`,
    });
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
});

app.post('/api/db/init-tables', async (req: Request, res: Response) => {
  const config = readMongoConfig();
  let client: MongoClient | null = null;

  try {
    const mongo = await getMongoClient(config);
    client = mongo.client;
    await ensureCollectionsExist(mongo.db);

    res.json({
      success: true,
      message: `پایگاه داده '${config.database || 'clinic'}' و مجموعه‌های مربوطه با موفقیت آماده‌سازی شدند.`,
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
    const consumablesDocs = await mongo.db.collection('consumables').find({}).toArray();
    const consumables = consumablesDocs.map(cleanDoc);
    const shareholdersDocs = await mongo.db.collection('shareholders').find({}).toArray();
    const shareholders = shareholdersDocs.map(cleanDoc);

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
        consumables,
        shareholders,
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
  const { patients, services, operators, admissions, followUps, consumables, shareholders, settings } = req.body || {};
  let client: MongoClient | null = null;

  try {
    const mongo = await getMongoClient(config);
    client = mongo.client;
    await ensureCollectionsExist(mongo.db);

    if (Array.isArray(patients)) {
      const normalizeNationalId = (value: unknown) => String(value || '')
        .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
        .trim();
      const nationalIds = new Set<string>();
      for (const p of patients) {
        const nationalId = normalizeNationalId(p?.nationalId);
        if (!nationalId) continue;
        if (nationalIds.has(nationalId)) {
          res.status(409).json({ success: false, code: 'DUPLICATE_NATIONAL_ID', message: 'بیمار با این کد ملی در پرونده‌ها وجود دارد.' });
          return;
        }
        nationalIds.add(nationalId);
        const duplicate = await mongo.db.collection('patients').findOne({
          nationalId: { $in: [nationalId, p.nationalId] },
          id: { $ne: p.id },
        });
        if (duplicate) {
          res.status(409).json({ success: false, code: 'DUPLICATE_NATIONAL_ID', message: 'بیمار با این کد ملی در پرونده‌ها وجود دارد.' });
          return;
        }
      }
      for (const p of patients) {
        if (!p.id) continue;
        const normalized = normalizeNationalId(p.nationalId);
        await mongo.db.collection('patients').replaceOne({ id: p.id }, { ...p, nationalId: normalized }, { upsert: true });
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

    if (Array.isArray(consumables)) {
      for (const item of consumables) {
        if (!item.name) continue;
        await mongo.db.collection('consumables').replaceOne({ name: item.name }, item, { upsert: true });
      }
    }

    if (Array.isArray(shareholders)) {
      for (const item of shareholders) {
        if (!item.id) continue;
        await mongo.db.collection('shareholders').replaceOne({ id: item.id }, item, { upsert: true });
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
      message: 'تمامی اطلاعات با موفقیت در MongoDB همگام‌سازی شدند.',
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: `خطا در ذخیره‌سازی داده‌ها در MongoDB: ${e.message}` });
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
});

app.post('/api/db/restore', async (req: Request, res: Response) => {
  const payload = req.body || {};
  let activeClient: MongoClient | null = null;
  try {
    const mongo = await getMongoClient(readMongoConfig());
    activeClient = mongo.client;
    await ensureCollectionsExist(mongo.db);

    const collections: Record<string, any[]> = {
      patients: payload.patients,
      services: payload.services,
      operators: payload.operators,
      admissions: payload.admissions,
      followups: payload.followUps,
      consumables: payload.consumables,
      shareholders: payload.shareholders,
    };

    for (const [name, items] of Object.entries(collections)) {
      if (!Array.isArray(items)) {
        res.status(400).json({ success: false, message: `فهرست ${name} در فایل پشتیبان معتبر نیست.` });
        return;
      }
    }

    const restoredNationalIds = new Set<string>();
    for (const patient of collections.patients) {
      const nationalId = String(patient?.nationalId || '')
        .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
        .trim();
      if (!nationalId) continue;
      if (restoredNationalIds.has(nationalId)) {
        res.status(409).json({ success: false, message: 'فایل پشتیبان دارای کد ملی تکراری است: بیمار با این کد ملی در پرونده‌ها وجود دارد.' });
        return;
      }
      restoredNationalIds.add(nationalId);
    }

    for (const [name, items] of Object.entries(collections)) {
      const collection = mongo.db.collection(name);
      await collection.deleteMany({});
      if (items.length) {
        const cleanItems = items.map((item) => {
          const { _id, ...rest } = item || {};
          return rest;
        });
        await collection.insertMany(cleanItems, { ordered: true });
      }
    }

    if (payload.settings && typeof payload.settings === 'object') {
      await mongo.db.collection('settings').replaceOne(
        { id: 'main_settings' },
        { id: 'main_settings', data: payload.settings },
        { upsert: true }
      );
    }

    res.json({ success: true, message: 'اطلاعات پشتیبان در MongoDB بازیابی شد.' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: `خطا در بازیابی پشتیبان در MongoDB: ${e.message}` });
  } finally {
    if (activeClient) await activeClient.close().catch(() => {});
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
    res.json({ success: true, message: 'مجموعه‌های اطلاعاتی در MongoDB پاکسازی شدند.' });
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
      console.warn('Vite dev middleware skipped:', err);
    }
  }

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[ClinicMongoBackend] Express + MongoDB Server running on http://127.0.0.1:${PORT}`);
  });
}

setupApp();
