import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import mysql, { Connection, RowDataPacket } from 'mysql2/promise';

process.env.DISABLE_HMR = 'true';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

function getConfigFilePath(): string {
  if (process.env.CONFIG_PATH) return process.env.CONFIG_PATH;
  const cwdPath = path.join(process.cwd(), 'mysql-config.json');
  if (fs.existsSync(cwdPath)) return cwdPath;
  const exeNeighbor = path.join(path.dirname(process.execPath), 'mysql-config.json');
  if (fs.existsSync(exeNeighbor)) return exeNeighbor;
  const dirPath = path.join(__dirname, 'mysql-config.json');
  if (fs.existsSync(dirPath)) return dirPath;
  const parentDirPath = path.join(__dirname, '..', 'mysql-config.json');
  if (fs.existsSync(parentDirPath)) return parentDirPath;
  return cwdPath;
}

app.use(express.json({ limit: '50mb' }));

// Enable CORS for desktop clients (Tauri webview on tauri://localhost or http://tauri.localhost)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: MySQLConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'clinic_db',
  enabled: true,
};

function readMySQLConfig(): MySQLConfig {
  try {
    const filePath = getConfigFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Error reading mysql-config.json:', e);
  }
  return DEFAULT_CONFIG;
}

function writeMySQLConfig(config: MySQLConfig) {
  try {
    const filePath = getConfigFilePath();
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing mysql-config.json:', e);
  }
}

function ensureLocalMySQLServiceRunning() {
  if (process.platform === 'win32') {
    try {
      const cp = require('child_process');
      cp.execSync('net start MySQL80 2>nul || net start MySQL 2>nul || net start MariaDB 2>nul || net start wampmysqld64 2>nul || ver >nul', { timeout: 3000 });
    } catch {}
    return;
  }
  try {
    const cp = require('child_process');
    cp.execSync('/etc/init.d/mariadb start 2>/dev/null || service mysql start 2>/dev/null', { timeout: 3000 });
  } catch {}
}

async function getDBConnection(config?: MySQLConfig, selectDb = true): Promise<Connection> {
  const cfg = config || readMySQLConfig();
  const host = cfg.host || DEFAULT_CONFIG.host;
  const port = Number(cfg.port) || 3306;
  const user = cfg.user || DEFAULT_CONFIG.user;
  const password = cfg.password !== undefined ? cfg.password : (DEFAULT_CONFIG.password || '');
  const database = selectDb ? (cfg.database || DEFAULT_CONFIG.database) : undefined;

  try {
    const conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 7000,
    });
    return conn;
  } catch (err: any) {
    if ((host === '127.0.0.1' || host === 'localhost') && (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST')) {
      ensureLocalMySQLServiceRunning();
      await new Promise((r) => setTimeout(r, 600));
      return await mysql.createConnection({
        host,
        port,
        user,
        password,
        database,
        connectTimeout: 7000,
      });
    }
    throw err;
  }
}

// -------------------------------------------------------------
// API Endpoints for MySQL Database Configuration & Management
// -------------------------------------------------------------

// 1. Get current config
app.get('/api/db/config', (req: Request, res: Response) => {
  const cfg = readMySQLConfig();
  res.json({
    config: {
      ...cfg,
      hasPassword: Boolean(cfg.password && cfg.password.length > 0),
    },
    defaultConfig: {
      ...DEFAULT_CONFIG,
      hasPassword: Boolean(DEFAULT_CONFIG.password && DEFAULT_CONFIG.password.length > 0),
    },
  });
});

// 2. Save config
app.post('/api/db/config', (req: Request, res: Response) => {
  const body = req.body as Partial<MySQLConfig>;
  const current = readMySQLConfig();

  const updated: MySQLConfig = {
    host: body.host?.trim() || current.host || DEFAULT_CONFIG.host,
    port: Number(body.port) || current.port || DEFAULT_CONFIG.port,
    user: body.user?.trim() || current.user || DEFAULT_CONFIG.user,
    password: body.password !== undefined ? body.password : (current.password || DEFAULT_CONFIG.password),
    database: body.database?.trim() || current.database || DEFAULT_CONFIG.database,
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
  };

  writeMySQLConfig(updated);
  res.json({ success: true, message: 'تنظیمات دیتابیس MySQL با موفقیت ذخیره شد.', config: updated });
});

// 2.1 Reset config to system default
app.post('/api/db/reset-default', (req: Request, res: Response) => {
  writeMySQLConfig(DEFAULT_CONFIG);
  res.json({
    success: true,
    message: 'تنظیمات به پایگاه داده پیش‌فرض اصلی با موفقیت بازگردانده شد.',
    config: DEFAULT_CONFIG,
  });
});

// 3. Test Connection
app.post('/api/db/test', async (req: Request, res: Response) => {
  const cfg = req.body as MySQLConfig;
  const host = cfg.host?.trim() || DEFAULT_CONFIG.host;
  const port = Number(cfg.port) || DEFAULT_CONFIG.port;
  const user = cfg.user?.trim() || DEFAULT_CONFIG.user;
  const password = cfg.password !== undefined ? cfg.password : DEFAULT_CONFIG.password;
  const database = cfg.database?.trim() || DEFAULT_CONFIG.database;

  let conn: Connection | null = null;
  try {
    // First connect to MySQL server without selecting database
    try {
      conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        connectTimeout: 5000,
      });
    } catch (firstErr: any) {
      if ((host === '127.0.0.1' || host === 'localhost') && (firstErr.code === 'ECONNREFUSED' || firstErr.code === 'PROTOCOL_CONNECTION_LOST')) {
        ensureLocalMySQLServiceRunning();
        await new Promise((r) => setTimeout(r, 600));
        conn = await mysql.createConnection({
          host,
          port,
          user,
          password,
          connectTimeout: 5000,
        });
      } else {
        throw firstErr;
      }
    }

    const [rows] = await conn.query<RowDataPacket[]>('SELECT VERSION() as version');
    const version = rows[0]?.version || 'MySQL';

    // Check if database exists
    const [dbs] = await conn.query<RowDataPacket[]>('SHOW DATABASES LIKE ?', [database]);
    const dbExists = Array.isArray(dbs) && dbs.length > 0;

    let tablesCount = 0;
    if (dbExists) {
      await conn.query(`USE \`${database}\``);
      const [tables] = await conn.query<RowDataPacket[]>('SHOW TABLES');
      tablesCount = Array.isArray(tables) ? tables.length : 0;
    }

    res.json({
      success: true,
      message: `ارتباط با پایگاه داده برقرار شد (نسخه: ${version})${!dbExists ? ` - پایگاه داده "${database}" هنوز ساخته نشده است و با زدن دکمه «ایجاد جداول» خودکار ساخته می‌شود.` : ` - تعداد جداول موجود: ${tablesCount}`}`,
      version,
      databaseExists: dbExists,
      tablesCount,
    });
  } catch (error: any) {
    let userMsg = error.message;

    if (error.code === 'ECONNREFUSED') {
      userMsg = `امکان اتصال به سرور MySQL روی ${host}:${port} وجود ندارد. لطفاً اطمینان حاصل کنید که سرویس MySQL در حال اجرا است و پورت ${port} باز است.`;
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      userMsg = `نام کاربری (${user}) یا رمز عبور دیتابیس MySQL اشتباه است.`;
    } else if (error.code === 'ENOTFOUND') {
      userMsg = `آدرس سرور MySQL (${host}) نامعتبر است یا پیدا نشد.`;
    } else if (error.code === 'ETIMEDOUT') {
      userMsg = `مهلت برقراری ارتباط با سرور MySQL (${host}:${port}) به پایان رسید (Timeout). لطفاً فایروال یا وضعیت اتصال سرور را بررسی فرمایید.`;
    }

    res.json({
      success: false,
      message: userMsg,
      code: error.code,
    });
  } finally {
    if (conn) {
      await conn.end().catch(() => {});
    }
  }
});

// 4. Initialize Database & Tables
app.post('/api/db/init-tables', async (req: Request, res: Response) => {
  const cfg = req.body as MySQLConfig;
  const host = cfg.host?.trim() || DEFAULT_CONFIG.host;
  const port = Number(cfg.port) || DEFAULT_CONFIG.port;
  const user = cfg.user?.trim() || DEFAULT_CONFIG.user;
  const password = cfg.password !== undefined ? cfg.password : DEFAULT_CONFIG.password;
  const database = cfg.database?.trim() || DEFAULT_CONFIG.database;

  let conn: Connection | null = null;
  try {
    try {
      conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        connectTimeout: 8000,
      });
    } catch (firstErr: any) {
      if ((host === '127.0.0.1' || host === 'localhost') && (firstErr.code === 'ECONNREFUSED' || firstErr.code === 'PROTOCOL_CONNECTION_LOST')) {
        ensureLocalMySQLServiceRunning();
        await new Promise((r) => setTimeout(r, 600));
        conn = await mysql.createConnection({
          host,
          port,
          user,
          password,
          connectTimeout: 8000,
        });
      } else {
        throw firstErr;
      }
    }

    // 1. Create Database
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${database}\``);

    // 2. Create Patients Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(64) PRIMARY KEY,
        national_id VARCHAR(32),
        first_name VARCHAR(128) NOT NULL,
        last_name VARCHAR(128) NOT NULL,
        phone VARCHAR(32) NOT NULL,
        age INT DEFAULT 0,
        gender VARCHAR(16) DEFAULT 'female',
        address TEXT,
        job VARCHAR(128),
        medical_history TEXT,
        allergies TEXT,
        notes TEXT,
        created_at VARCHAR(32),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_national_id (national_id),
        INDEX idx_phone (phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Create Admissions Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admissions (
        id VARCHAR(64) PRIMARY KEY,
        admission_number VARCHAR(64) NOT NULL,
        patient_id VARCHAR(64) NOT NULL,
        patient_name VARCHAR(128) NOT NULL,
        patient_phone VARCHAR(32) NOT NULL,
        patient_national_id VARCHAR(32),
        service_id VARCHAR(64) NOT NULL,
        service_name VARCHAR(128) NOT NULL,
        service_category VARCHAR(64) NOT NULL,
        operator_id VARCHAR(64),
        operator_name VARCHAR(128),
        date VARCHAR(32) NOT NULL,
        timestamp BIGINT NOT NULL,
        details_json LONGTEXT,
        consumables_json LONGTEXT,
        base_price BIGINT DEFAULT 0,
        quantity INT DEFAULT 1,
        discount BIGINT DEFAULT 0,
        final_amount BIGINT DEFAULT 0,
        paid_amount BIGINT DEFAULT 0,
        debt_amount BIGINT DEFAULT 0,
        payment_method VARCHAR(32) DEFAULT 'pos',
        payment_methods_json TEXT,
        payment_notes TEXT,
        cheque_details_json LONGTEXT,
        follow_up_date VARCHAR(32),
        follow_up_reason TEXT,
        status VARCHAR(32) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_date (date),
        INDEX idx_patient_id (patient_id),
        INDEX idx_service_category (service_category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Create Services Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(64) PRIMARY KEY,
        category VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        default_price BIGINT DEFAULT 0,
        follow_up_days_default INT DEFAULT 30,
        follow_up_note_default TEXT,
        default_sessions INT DEFAULT 1,
        active TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Create Operators Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS operators (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        role VARCHAR(32) DEFAULT 'doctor',
        commission_rate DECIMAL(5,2) DEFAULT 0,
        phone VARCHAR(32),
        active TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Create Follow-ups Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS follow_ups (
        id VARCHAR(64) PRIMARY KEY,
        patient_id VARCHAR(64) NOT NULL,
        patient_name VARCHAR(128) NOT NULL,
        patient_phone VARCHAR(32) NOT NULL,
        admission_id VARCHAR(64),
        service_name VARCHAR(128) NOT NULL,
        operator_name VARCHAR(128),
        previous_visit_date VARCHAR(32),
        scheduled_date VARCHAR(32) NOT NULL,
        status VARCHAR(32) DEFAULT 'pending',
        reason TEXT,
        notes TEXT,
        INDEX idx_scheduled_date (scheduled_date),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Create Shareholders Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS shareholders (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        share_percentage DECIMAL(5,2) DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Create Consumables Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS consumables (
        name VARCHAR(128) PRIMARY KEY,
        cost BIGINT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Create Clinic Settings Table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS clinic_settings (
        id INT PRIMARY KEY,
        clinic_name VARCHAR(255),
        doctor_name VARCHAR(255),
        phone VARCHAR(64),
        address TEXT,
        receipt_footer TEXT,
        admin_pin VARCHAR(32),
        currency_unit VARCHAR(16) DEFAULT 'rial',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Create Generic Key-Value Document Store Table for full resilience
    await conn.query(`
      CREATE TABLE IF NOT EXISTS clinic_state_backup (
        key_name VARCHAR(64) PRIMARY KEY,
        payload LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Save as current active config
    writeMySQLConfig({
      host,
      port,
      user,
      password,
      database,
      enabled: true,
    });

    res.json({
      success: true,
      message: `پایگاه داده "${database}" و تمامی ۹ جدول موردنیاز سامانه با موفقیت در MySQL ایجاد و آماده‌سازی شدند.`,
    });
  } catch (error: any) {
    res.json({
      success: false,
      message: `خطا در ایجاد جداول MySQL: ${error.message}`,
    });
  } finally {
    if (conn) {
      await conn.end().catch(() => {});
    }
  }
});

// 5. Load all clinic data from MySQL
app.get('/api/db/load', async (req: Request, res: Response) => {
  const cfg = readMySQLConfig();
  if (!cfg.enabled) {
    return res.status(400).json({ success: false, message: 'دیتابیس MySQL در تنظیمات فعال نیست.' });
  }

  let conn: Connection | null = null;
  try {
    conn = await getDBConnection(cfg, true);

    // Patients
    const [patRows] = await conn.query<RowDataPacket[]>('SELECT * FROM patients ORDER BY created_at DESC');
    const patients = patRows.map((r) => ({
      id: r.id,
      nationalId: r.national_id || '',
      firstName: r.first_name,
      lastName: r.last_name,
      phone: r.phone,
      age: Number(r.age) || 0,
      gender: r.gender || 'female',
      address: r.address || '',
      job: r.job || '',
      medicalHistory: r.medical_history || '',
      allergies: r.allergies || '',
      notes: r.notes || '',
      createdAt: r.created_at || '',
    }));

    // Admissions
    const [admRows] = await conn.query<RowDataPacket[]>('SELECT * FROM admissions ORDER BY timestamp DESC');
    const admissions = admRows.map((r) => {
      let details = {};
      let consumables: any[] = [];
      let paymentMethods: any = undefined;
      let chequeDetails: any = undefined;

      try {
        if (r.details_json) details = JSON.parse(r.details_json);
      } catch {}
      try {
        if (r.consumables_json) consumables = JSON.parse(r.consumables_json);
      } catch {}
      try {
        if (r.payment_methods_json) paymentMethods = JSON.parse(r.payment_methods_json);
      } catch {}
      try {
        if (r.cheque_details_json) chequeDetails = JSON.parse(r.cheque_details_json);
      } catch {}

      return {
        id: r.id,
        admissionNumber: r.admission_number,
        patientId: r.patient_id,
        patientName: r.patient_name,
        patientPhone: r.patient_phone,
        patientNationalId: r.patient_national_id || '',
        serviceId: r.service_id,
        serviceName: r.service_name,
        serviceCategory: r.service_category,
        operatorId: r.operator_id || '',
        operatorName: r.operator_name || '',
        date: r.date,
        timestamp: Number(r.timestamp) || Date.now(),
        details,
        consumables,
        basePrice: Number(r.base_price) || 0,
        quantity: Number(r.quantity) || 1,
        discount: Number(r.discount) || 0,
        finalAmount: Number(r.final_amount) || 0,
        paidAmount: Number(r.paid_amount) || 0,
        debtAmount: Number(r.debt_amount) || 0,
        paymentMethod: r.payment_method || 'pos',
        paymentMethods,
        paymentNotes: r.payment_notes || undefined,
        chequeDetails,
        followUpDate: r.follow_up_date || undefined,
        followUpReason: r.follow_up_reason || undefined,
        status: r.status || 'completed',
      };
    });

    // Services
    const [srvRows] = await conn.query<RowDataPacket[]>('SELECT * FROM services');
    const services = srvRows.map((r) => ({
      id: r.id,
      category: r.category,
      name: r.name,
      defaultPrice: Number(r.default_price) || 0,
      followUpDaysDefault: Number(r.follow_up_days_default) || 30,
      followUpNoteDefault: r.follow_up_note_default || '',
      defaultSessions: Number(r.default_sessions) || 1,
      active: Boolean(r.active),
    }));

    // Operators
    const [opRows] = await conn.query<RowDataPacket[]>('SELECT * FROM operators');
    const operators = opRows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role || 'doctor',
      commissionRate: Number(r.commission_rate) || 0,
      phone: r.phone || '',
      active: Boolean(r.active),
    }));

    // Follow-ups
    const [flwRows] = await conn.query<RowDataPacket[]>('SELECT * FROM follow_ups');
    const followUps = flwRows.map((r) => ({
      id: r.id,
      patientId: r.patient_id,
      patientName: r.patient_name,
      patientPhone: r.patient_phone,
      admissionId: r.admission_id || undefined,
      serviceName: r.service_name,
      operatorName: r.operator_name || '',
      previousVisitDate: r.previous_visit_date || '',
      scheduledDate: r.scheduled_date,
      status: r.status || 'pending',
      reason: r.reason || '',
      notes: r.notes || '',
    }));

    // Shareholders
    const [shRows] = await conn.query<RowDataPacket[]>('SELECT * FROM shareholders');
    const shareholders = shRows.map((r) => ({
      id: r.id,
      name: r.name,
      sharePercentage: Number(r.share_percentage) || 0,
    }));

    // Consumables
    const [conRows] = await conn.query<RowDataPacket[]>('SELECT * FROM consumables');
    const consumables = conRows.map((r) => ({
      name: r.name,
      cost: Number(r.cost) || 0,
    }));

    // Settings
    const [settRows] = await conn.query<RowDataPacket[]>('SELECT * FROM clinic_settings WHERE id = 1');
    let settings: any = null;
    if (settRows.length > 0) {
      const s = settRows[0];
      settings = {
        clinicName: s.clinic_name,
        doctorName: s.doctor_name,
        phone: s.phone,
        address: s.address,
        receiptFooter: s.receipt_footer,
        adminPin: s.admin_pin || '1234',
        currencyUnit: s.currency_unit || 'rial',
        mysqlConfig: cfg,
      };
    }

    res.json({
      success: true,
      data: {
        patients,
        admissions,
        services: services.length > 0 ? services : undefined,
        operators,
        followUps,
        shareholders,
        consumables: consumables.length > 0 ? consumables : undefined,
        settings: settings || undefined,
      },
    });
  } catch (error: any) {
    res.json({
      success: false,
      message: `خطا در دریافت اطلاعات از دیتابیس MySQL: ${error.message}`,
    });
  } finally {
    if (conn) {
      await conn.end().catch(() => {});
    }
  }
});

// 6. Sync/Save all clinic data to MySQL
app.post('/api/db/sync', async (req: Request, res: Response) => {
  const cfg = readMySQLConfig();
  if (!cfg.enabled) {
    return res.status(400).json({ success: false, message: 'دیتابیس MySQL غیرفعال است.' });
  }

  const {
    patients = [],
    admissions = [],
    services = [],
    operators = [],
    followUps = [],
    shareholders = [],
    consumables = [],
    settings,
  } = req.body;

  let conn: Connection | null = null;
  try {
    conn = await getDBConnection(cfg, true);

    // Save full JSON backup state
    await conn.query(
      `INSERT INTO clinic_state_backup (key_name, payload) VALUES ('full_clinic_state', ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
      [JSON.stringify(req.body)]
    );

    // Sync Patients
    if (Array.isArray(patients)) {
      for (const p of patients) {
        await conn.query(
          `INSERT INTO patients (
            id, national_id, first_name, last_name, phone, age, gender, address, job, medical_history, allergies, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            national_id = VALUES(national_id),
            first_name = VALUES(first_name),
            last_name = VALUES(last_name),
            phone = VALUES(phone),
            age = VALUES(age),
            gender = VALUES(gender),
            address = VALUES(address),
            job = VALUES(job),
            medical_history = VALUES(medical_history),
            allergies = VALUES(allergies),
            notes = VALUES(notes)`,
          [
            p.id,
            p.nationalId || '',
            p.firstName,
            p.lastName,
            p.phone,
            p.age || 0,
            p.gender || 'female',
            p.address || '',
            p.job || '',
            p.medicalHistory || '',
            p.allergies || '',
            p.notes || '',
            p.createdAt || '',
          ]
        );
      }
    }

    // Sync Admissions
    if (Array.isArray(admissions)) {
      for (const a of admissions) {
        await conn.query(
          `INSERT INTO admissions (
            id, admission_number, patient_id, patient_name, patient_phone, patient_national_id,
            service_id, service_name, service_category, operator_id, operator_name, date, timestamp,
            details_json, consumables_json, base_price, quantity, discount, final_amount, paid_amount,
            debt_amount, payment_method, payment_methods_json, payment_notes, cheque_details_json,
            follow_up_date, follow_up_reason, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            paid_amount = VALUES(paid_amount),
            debt_amount = VALUES(debt_amount),
            status = VALUES(status),
            details_json = VALUES(details_json),
            payment_methods_json = VALUES(payment_methods_json),
            payment_notes = VALUES(payment_notes),
            cheque_details_json = VALUES(cheque_details_json)`,
          [
            a.id,
            a.admissionNumber,
            a.patientId,
            a.patientName,
            a.patientPhone,
            a.patientNationalId || '',
            a.serviceId,
            a.serviceName,
            a.serviceCategory,
            a.operatorId || '',
            a.operatorName || '',
            a.date,
            a.timestamp || Date.now(),
            JSON.stringify(a.details || {}),
            JSON.stringify(a.consumables || []),
            a.basePrice || 0,
            a.quantity || 1,
            a.discount || 0,
            a.finalAmount || 0,
            a.paidAmount || 0,
            a.debtAmount || 0,
            a.paymentMethod || 'pos',
            a.paymentMethods ? JSON.stringify(a.paymentMethods) : null,
            a.paymentNotes || null,
            a.chequeDetails ? JSON.stringify(a.chequeDetails) : null,
            a.followUpDate || null,
            a.followUpReason || null,
            a.status || 'completed',
          ]
        );
      }
    }

    // Sync Follow-ups
    if (Array.isArray(followUps)) {
      for (const f of followUps) {
        await conn.query(
          `INSERT INTO follow_ups (
            id, patient_id, patient_name, patient_phone, admission_id, service_name, operator_name,
            previous_visit_date, scheduled_date, status, reason, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            scheduled_date = VALUES(scheduled_date),
            status = VALUES(status),
            notes = VALUES(notes)`,
          [
            f.id,
            f.patientId,
            f.patientName,
            f.patientPhone,
            f.admissionId || null,
            f.serviceName,
            f.operatorName || '',
            f.previousVisitDate || '',
            f.scheduledDate,
            f.status || 'pending',
            f.reason || '',
            f.notes || '',
          ]
        );
      }
    }

    // Sync Services
    if (Array.isArray(services)) {
      for (const s of services) {
        await conn.query(
          `INSERT INTO services (
            id, category, name, default_price, follow_up_days_default, follow_up_note_default, default_sessions, active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            category = VALUES(category),
            name = VALUES(name),
            default_price = VALUES(default_price),
            follow_up_days_default = VALUES(follow_up_days_default),
            follow_up_note_default = VALUES(follow_up_note_default),
            default_sessions = VALUES(default_sessions),
            active = VALUES(active)`,
          [
            s.id,
            s.category || 'other',
            s.name,
            s.defaultPrice || 0,
            s.followUpDaysDefault || 30,
            s.followUpNoteDefault || '',
            s.defaultSessions || 1,
            s.active !== false ? 1 : 0,
          ]
        );
      }
    }

    // Sync Operators
    if (Array.isArray(operators)) {
      if (operators.length === 0) {
        await conn.query('DELETE FROM operators');
      } else {
        const opIds = operators.map((o) => o.id);
        const placeholders = opIds.map(() => '?').join(',');
        await conn.query(`DELETE FROM operators WHERE id NOT IN (${placeholders})`, opIds);
        for (const op of operators) {
          await conn.query(
            `INSERT INTO operators (
              id, name, role, commission_rate, phone, active
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              role = VALUES(role),
              commission_rate = VALUES(commission_rate),
              phone = VALUES(phone),
              active = VALUES(active)`,
            [
              op.id,
              op.name,
              op.role || 'doctor',
              op.commissionRate || 0,
              op.phone || '',
              op.active !== false ? 1 : 0,
            ]
          );
        }
      }
    }

    // Sync Consumables
    if (Array.isArray(consumables)) {
      for (const c of consumables) {
        await conn.query(
          `INSERT INTO consumables (
            name, cost
          ) VALUES (?, ?)
          ON DUPLICATE KEY UPDATE
            cost = VALUES(cost)`,
          [c.name, c.cost || 0]
        );
      }
    }

    // Sync Shareholders
    if (Array.isArray(shareholders)) {
      if (shareholders.length === 0) {
        await conn.query('DELETE FROM shareholders');
      } else {
        const shIds = shareholders.map((s) => s.id);
        const placeholders = shIds.map(() => '?').join(',');
        await conn.query(`DELETE FROM shareholders WHERE id NOT IN (${placeholders})`, shIds);
        for (const sh of shareholders) {
          await conn.query(
            `INSERT INTO shareholders (
              id, name, share_percentage
            ) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              share_percentage = VALUES(share_percentage)`,
            [sh.id, sh.name, sh.sharePercentage || 0]
          );
        }
      }
    }

    // Sync Settings
    if (settings) {
      await conn.query(
        `INSERT INTO clinic_settings (
          id, clinic_name, doctor_name, phone, address, receipt_footer, admin_pin, currency_unit
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          clinic_name = VALUES(clinic_name),
          doctor_name = VALUES(doctor_name),
          phone = VALUES(phone),
          address = VALUES(address),
          receipt_footer = VALUES(receipt_footer),
          admin_pin = VALUES(admin_pin),
          currency_unit = VALUES(currency_unit)`,
        [
          settings.clinicName || '',
          settings.doctorName || '',
          settings.phone || '',
          settings.address || '',
          settings.receiptFooter || '',
          settings.adminPin || '1234',
          settings.currencyUnit || 'rial',
        ]
      );
    }

    res.json({
      success: true,
      message: 'همگام‌سازی و ذخیره‌سازی داده‌ها در پایگاه داده MySQL با موفقیت انجام شد.',
      stats: {
        patients: patients.length,
        admissions: admissions.length,
        services: services.length,
        operators: operators.length,
        consumables: consumables.length,
        shareholders: shareholders.length,
        followUps: followUps.length,
      },
    });
  } catch (error: any) {
    res.json({
      success: false,
      message: `خطا در ذخیره‌سازی اطلاعات در دیتابیس MySQL: ${error.message}`,
    });
  } finally {
    if (conn) {
      await conn.end().catch(() => {});
    }
  }
});

// 7. Full MySQL Database Export (Backup endpoint)
app.get('/api/db/backup', async (req: Request, res: Response) => {
  const cfg = readMySQLConfig();
  if (!cfg.enabled) {
    return res.json({ success: false, message: 'دیتابیس MySQL غیرفعال است.' });
  }

  let conn: Connection | null = null;
  try {
    conn = await getDBConnection(cfg, true);

    const [patients] = await conn.query<RowDataPacket[]>('SELECT * FROM patients');
    const [admissions] = await conn.query<RowDataPacket[]>('SELECT * FROM admissions');
    const [services] = await conn.query<RowDataPacket[]>('SELECT * FROM services');
    const [operators] = await conn.query<RowDataPacket[]>('SELECT * FROM operators');
    const [followUps] = await conn.query<RowDataPacket[]>('SELECT * FROM follow_ups');
    const [consumables] = await conn.query<RowDataPacket[]>('SELECT * FROM consumables');
    const [shareholders] = await conn.query<RowDataPacket[]>('SELECT * FROM shareholders');
    const [settings] = await conn.query<RowDataPacket[]>('SELECT * FROM clinic_settings WHERE id = 1');

    const backupPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      database: cfg.database,
      tables: {
        patients,
        admissions,
        services,
        operators,
        followUps,
        consumables,
        shareholders,
        settings: settings[0] || null,
      },
    };

    // Also generate SQL dump script
    let sqlDump = `-- Clinic Database Backup Dump\n-- Generated at: ${new Date().toISOString()}\n-- Database: ${cfg.database}\n\n`;
    sqlDump += `/*!40101 SET NAMES utf8mb4 */;\n\n`;
    
    // Dump patients
    if (patients.length > 0) {
      sqlDump += `-- Patients (${patients.length} records)\n`;
      for (const p of patients) {
        sqlDump += `REPLACE INTO patients (id, national_id, first_name, last_name, phone, age, gender, address, job, medical_history, allergies, notes) VALUES (${mysql.escape(p.id)}, ${mysql.escape(p.national_id)}, ${mysql.escape(p.first_name)}, ${mysql.escape(p.last_name)}, ${mysql.escape(p.phone)}, ${mysql.escape(p.age)}, ${mysql.escape(p.gender)}, ${mysql.escape(p.address)}, ${mysql.escape(p.job)}, ${mysql.escape(p.medical_history)}, ${mysql.escape(p.allergies)}, ${mysql.escape(p.notes)});\n`;
      }
      sqlDump += '\n';
    }

    // Dump admissions
    if (admissions.length > 0) {
      sqlDump += `-- Admissions (${admissions.length} records)\n`;
      for (const a of admissions) {
        sqlDump += `REPLACE INTO admissions (id, admission_number, patient_id, patient_name, patient_phone, patient_national_id, service_id, service_name, service_category, operator_id, operator_name, date, timestamp, details_json, consumables_json, base_price, quantity, discount, final_amount, paid_amount, debt_amount, payment_method, status) VALUES (${mysql.escape(a.id)}, ${mysql.escape(a.admission_number)}, ${mysql.escape(a.patient_id)}, ${mysql.escape(a.patient_name)}, ${mysql.escape(a.patient_phone)}, ${mysql.escape(a.patient_national_id)}, ${mysql.escape(a.service_id)}, ${mysql.escape(a.service_name)}, ${mysql.escape(a.service_category)}, ${mysql.escape(a.operator_id)}, ${mysql.escape(a.operator_name)}, ${mysql.escape(a.date)}, ${mysql.escape(a.timestamp)}, ${mysql.escape(a.details_json)}, ${mysql.escape(a.consumables_json)}, ${mysql.escape(a.base_price)}, ${mysql.escape(a.quantity)}, ${mysql.escape(a.discount)}, ${mysql.escape(a.final_amount)}, ${mysql.escape(a.paid_amount)}, ${mysql.escape(a.debt_amount)}, ${mysql.escape(a.payment_method)}, ${mysql.escape(a.status)});\n`;
      }
      sqlDump += '\n';
    }

    res.json({
      success: true,
      backup: backupPayload,
      sqlDump,
      message: 'نسخه پشتیبان پایگاه داده MySQL با موفقیت ایجاد شد.',
    });
  } catch (error: any) {
    res.json({
      success: false,
      message: `خطا در تهیه نسخه پشتیبان MySQL: ${error.message}`,
    });
  } finally {
    if (conn) {
      await conn.end().catch(() => {});
    }
  }
});

// 8. Clear all clinic tables in MySQL
app.post('/api/db/clear', async (req: Request, res: Response) => {
  const cfg = readMySQLConfig();
  if (!cfg.enabled) {
    return res.status(400).json({ success: false, message: 'دیتابیس MySQL فعال نیست.' });
  }

  let conn: Connection | null = null;
  try {
    conn = await getDBConnection(cfg, true);
    await conn.query('DELETE FROM admissions');
    await conn.query('DELETE FROM patients');
    await conn.query('DELETE FROM follow_ups');
    await conn.query('DELETE FROM clinic_state_backup');

    res.json({
      success: true,
      message: 'تمامی اطلاعات بیماران، پذیرش‌ها و پیگیری‌ها از دیتابیس MySQL پاکسازی شدند.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `خطا در پاکسازی دیتابیس: ${error.message}`,
    });
  } finally {
    if (conn) {
      await conn.end().catch(() => {});
    }
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Files Serving
// -------------------------------------------------------------
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
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite development server not loaded:', e);
    }
  }

  // Ensure local MySQL/MariaDB service is active if available
  ensureLocalMySQLServiceRunning();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Clinic Management App running at http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is already in use by another running instance. Reusing existing instance.`);
    } else {
      console.error('Server error:', err);
    }
  });
}

setupApp();
