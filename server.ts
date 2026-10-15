import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import mysql, { Connection, RowDataPacket } from 'mysql2/promise';

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

export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: MySQLConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'clinic_db',
  enabled: true,
};

function getConfigFilePath(): string {
  if (process.env.CONFIG_PATH) return process.env.CONFIG_PATH;
  
  const exeDir = path.dirname(process.execPath);
  const possiblePaths = [
    path.join(process.cwd(), 'mysql-config.json'),
    path.join(exeDir, 'mysql-config.json'),
    path.join(exeDir, '..', 'mysql-config.json'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  return path.join(process.cwd(), 'mysql-config.json');
}

function readMySQLConfig(): MySQLConfig {
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

function writeMySQLConfig(config: MySQLConfig): void {
  try {
    const filePath = getConfigFilePath();
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing config file:', e);
  }
}

async function getRawConnection(config: MySQLConfig, withDatabase = true): Promise<Connection> {
  const options: mysql.ConnectionOptions = {
    host: config.host || '127.0.0.1',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || '',
    connectTimeout: 5000,
  };
  if (withDatabase && config.database) {
    options.database = config.database;
  }
  return await mysql.createConnection(options);
}

// Ensure database and schema tables exist
async function ensureTablesExist(conn: Connection) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id VARCHAR(50) PRIMARY KEY,
      data JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id VARCHAR(100) PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(50),
      national_id VARCHAR(50),
      gender VARCHAR(20),
      birth_date VARCHAR(50),
      notes TEXT,
      created_at VARCHAR(50),
      raw_data JSON
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS services (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      price BIGINT NOT NULL,
      category VARCHAR(100),
      description TEXT,
      raw_data JSON
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS operators (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      role VARCHAR(100),
      percent INT DEFAULT 0,
      phone VARCHAR(50),
      raw_data JSON
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS admissions (
      id VARCHAR(100) PRIMARY KEY,
      patient_id VARCHAR(100),
      patient_name VARCHAR(200),
      admission_date VARCHAR(50),
      total_amount BIGINT DEFAULT 0,
      final_amount BIGINT DEFAULT 0,
      discount_amount BIGINT DEFAULT 0,
      payment_type VARCHAR(50),
      operator_id VARCHAR(100),
      operator_name VARCHAR(150),
      raw_data JSON,
      INDEX idx_patient (patient_id),
      INDEX idx_date (admission_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS followups (
      id VARCHAR(100) PRIMARY KEY,
      patient_id VARCHAR(100),
      patient_name VARCHAR(200),
      patient_phone VARCHAR(50),
      scheduled_date VARCHAR(50),
      status VARCHAR(50),
      notes TEXT,
      raw_data JSON,
      INDEX idx_scheduled (scheduled_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// API Routes
app.get('/api/ping', (req: Request, res: Response) => {
  res.json({ ok: true, server: 'ClinicBackend', time: new Date().toISOString() });
});

app.get('/api/db/config', (req: Request, res: Response) => {
  const config = readMySQLConfig();
  res.json({ success: true, config });
});

app.post('/api/db/config', (req: Request, res: Response) => {
  const newConfig = req.body as MySQLConfig;
  if (!newConfig || !newConfig.host) {
    res.status(400).json({ success: false, message: 'تنظیمات نامعتبر است' });
    return;
  }
  writeMySQLConfig(newConfig);
  res.json({ success: true, message: 'تنظیمات دیتابیس با موفقیت ذخیره شد', config: newConfig });
});

app.post('/api/db/reset-default', (req: Request, res: Response) => {
  writeMySQLConfig(DEFAULT_CONFIG);
  res.json({ success: true, message: 'تنظیمات به حالت پیش‌فرض (127.0.0.1:3306) بازنشانی شد', config: DEFAULT_CONFIG });
});

app.post('/api/db/test', async (req: Request, res: Response) => {
  const config = (req.body && req.body.host ? req.body : readMySQLConfig()) as MySQLConfig;
  
  let connWithoutDB: Connection | null = null;
  let connWithDB: Connection | null = null;

  try {
    connWithoutDB = await getRawConnection(config, false);
    const [verRows] = await connWithoutDB.query<RowDataPacket[]>('SELECT VERSION() as version');
    const versionStr = verRows[0]?.version || 'MySQL Server';

    const [dbRows] = await connWithoutDB.query<RowDataPacket[]>('SHOW DATABASES LIKE ?', [config.database]);
    const databaseExists = dbRows.length > 0;

    let tablesCount = 0;
    if (databaseExists) {
      connWithDB = await getRawConnection(config, true);
      const [tableRows] = await connWithDB.query<RowDataPacket[]>('SHOW TABLES');
      tablesCount = tableRows.length;
    }

    res.json({
      success: true,
      message: `اتصال به MySQL با موفقیت برقرار شد. (${versionStr})`,
      version: versionStr,
      databaseExists,
      tablesCount,
    });
  } catch (e: any) {
    res.json({
      success: false,
      message: `خطا در اتصال به MySQL: ${e.message || 'سرور پاسخگو نیست'}`,
    });
  } finally {
    if (connWithoutDB) await connWithoutDB.end().catch(() => {});
    if (connWithDB) await connWithDB.end().catch(() => {});
  }
});

app.post('/api/db/init-tables', async (req: Request, res: Response) => {
  const config = (req.body && req.body.host ? req.body : readMySQLConfig()) as MySQLConfig;
  let connWithoutDB: Connection | null = null;
  let connWithDB: Connection | null = null;

  try {
    connWithoutDB = await getRawConnection(config, false);
    await connWithoutDB.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);

    connWithDB = await getRawConnection(config, true);
    await ensureTablesExist(connWithDB);

    res.json({
      success: true,
      message: `پایگاه داده '${config.database}' و تمامی جداول مربوطه با موفقیت ایجاد و آماده‌سازی شدند.`,
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      message: `خطا در ساخت جداول دیتابیس: ${e.message}`,
    });
  } finally {
    if (connWithoutDB) await connWithoutDB.end().catch(() => {});
    if (connWithDB) await connWithDB.end().catch(() => {});
  }
});

app.get('/api/db/load', async (req: Request, res: Response) => {
  const config = readMySQLConfig();
  if (!config.enabled) {
    res.json({ success: false, message: 'MySQL اتصال غیرفعال است' });
    return;
  }

  let conn: Connection | null = null;
  try {
    conn = await getRawConnection(config, true);
    await ensureTablesExist(conn);

    const [patientsRows] = await conn.query<RowDataPacket[]>('SELECT raw_data FROM patients');
    const patients = patientsRows.map((r) => typeof r.raw_data === 'string' ? JSON.parse(r.raw_data) : r.raw_data);

    const [servicesRows] = await conn.query<RowDataPacket[]>('SELECT raw_data FROM services');
    const services = servicesRows.map((r) => typeof r.raw_data === 'string' ? JSON.parse(r.raw_data) : r.raw_data);

    const [operatorsRows] = await conn.query<RowDataPacket[]>('SELECT raw_data FROM operators');
    const operators = operatorsRows.map((r) => typeof r.raw_data === 'string' ? JSON.parse(r.raw_data) : r.raw_data);

    const [admissionsRows] = await conn.query<RowDataPacket[]>('SELECT raw_data FROM admissions ORDER BY id DESC');
    const admissions = admissionsRows.map((r) => typeof r.raw_data === 'string' ? JSON.parse(r.raw_data) : r.raw_data);

    const [followupsRows] = await conn.query<RowDataPacket[]>('SELECT raw_data FROM followups');
    const followUps = followupsRows.map((r) => typeof r.raw_data === 'string' ? JSON.parse(r.raw_data) : r.raw_data);

    const [settingsRows] = await conn.query<RowDataPacket[]>('SELECT data FROM settings WHERE id = "main_settings"');
    let settings = null;
    if (settingsRows.length > 0) {
      settings = typeof settingsRows[0].data === 'string' ? JSON.parse(settingsRows[0].data) : settingsRows[0].data;
    }

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
    res.json({ success: false, message: `خطا در لود داده‌ها از MySQL: ${e.message}` });
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
});

app.post('/api/db/sync', async (req: Request, res: Response) => {
  const config = readMySQLConfig();
  if (!config.enabled) {
    res.json({ success: false, message: 'MySQL غیرفعال است' });
    return;
  }

  const { patients, services, operators, admissions, followUps, settings } = req.body || {};
  let conn: Connection | null = null;

  try {
    conn = await getRawConnection(config, true);
    await ensureTablesExist(conn);

    if (Array.isArray(patients)) {
      for (const p of patients) {
        if (!p.id) continue;
        await conn.query(
          `REPLACE INTO patients (id, first_name, last_name, phone, national_id, gender, birth_date, notes, created_at, raw_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id,
            p.firstName || '',
            p.lastName || '',
            p.phone || '',
            p.nationalId || '',
            p.gender || '',
            p.birthDate || '',
            p.notes || '',
            p.createdAt || '',
            JSON.stringify(p),
          ]
        );
      }
    }

    if (Array.isArray(services)) {
      for (const s of services) {
        if (!s.id) continue;
        await conn.query(
          `REPLACE INTO services (id, title, price, category, description, raw_data)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [s.id, s.title || '', s.price || 0, s.category || '', s.description || '', JSON.stringify(s)]
        );
      }
    }

    if (Array.isArray(operators)) {
      for (const o of operators) {
        if (!o.id) continue;
        await conn.query(
          `REPLACE INTO operators (id, name, role, percent, phone, raw_data)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [o.id, o.name || '', o.role || '', o.percent || 0, o.phone || '', JSON.stringify(o)]
        );
      }
    }

    if (Array.isArray(admissions)) {
      for (const a of admissions) {
        if (!a.id) continue;
        await conn.query(
          `REPLACE INTO admissions (id, patient_id, patient_name, admission_date, total_amount, final_amount, discount_amount, payment_type, operator_id, operator_name, raw_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            a.id,
            a.patientId || '',
            a.patientName || '',
            a.admissionDate || '',
            a.totalAmount || 0,
            a.finalAmount || 0,
            a.discountAmount || 0,
            a.paymentType || '',
            a.operatorId || '',
            a.operatorName || '',
            JSON.stringify(a),
          ]
        );
      }
    }

    if (Array.isArray(followUps)) {
      for (const f of followUps) {
        if (!f.id) continue;
        await conn.query(
          `REPLACE INTO followups (id, patient_id, patient_name, patient_phone, scheduled_date, status, notes, raw_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            f.id,
            f.patientId || '',
            f.patientName || '',
            f.patientPhone || '',
            f.scheduledDate || '',
            f.status || '',
            f.notes || '',
            JSON.stringify(f),
          ]
        );
      }
    }

    if (settings) {
      await conn.query(
        `REPLACE INTO settings (id, data) VALUES ('main_settings', ?)`,
        [JSON.stringify(settings)]
      );
    }

    res.json({
      success: true,
      message: 'تمامی اطلاعات با موفقیت در جدول‌های دیتابیس MySQL ثبت و ذخیره شدند.',
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: `خطا در ذخیره‌سازی داده‌ها در MySQL: ${e.message}` });
  } finally {
    if (conn) await conn.end().catch(() => {});
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
      // Dynamic import of Vite in development mode
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
    console.log(`[ClinicBackend] Express + MySQL Server running on http://127.0.0.1:${PORT}`);
  });
}

setupApp();
