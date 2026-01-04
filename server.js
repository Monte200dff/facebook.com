const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Տվյալների պահպանման գրացուցակ
const DATA_DIR = path.join(__dirname, 'data');

// Ստեղծել գրացուցակ, եթե չկա
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

// Գլխավոր էջ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Բոլոր տվյալների ցանկ
app.get('/api/data', async (req, res) => {
    try {
        await ensureDataDir();
        const files = await fs.readdir(DATA_DIR);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        const data = [];
        for (const file of jsonFiles) {
            const content = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
            data.push({
                filename: file,
                data: JSON.parse(content),
                created: (await fs.stat(path.join(DATA_DIR, file))).birthtime
            });
        }
        
        res.json({ success: true, data: data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Նոր տվյալների պահպանում
app.post('/api/save', async (req, res) => {
    try {
        await ensureDataDir();
        
        const formData = req.body;
        
        // Ավելացնել ժամանակի կնիք
        formData.timestamp = new Date().toISOString();
        
        // Ստեղծել յուրահատուկ ֆայլի անուն
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `entry_${timestamp}.json`;
        const filepath = path.join(DATA_DIR, filename);
        
        // Պահպանել JSON ֆայլում
        await fs.writeFile(filepath, JSON.stringify(formData, null, 2));
        
        console.log(`✅ Նոր մուտք պահպանված է: ${filename}`);
        res.json({ 
            success: true, 
            message: 'Տվյալները հաջողությամբ պահպանված են',
            filename: filename 
        });
    } catch (error) {
        console.error('❌ Սխալ տվյալների պահպանման ժամանակ:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ֆայլի ներբեռնում
app.get('/api/download/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(DATA_DIR, filename);
        
        // Ստուգել, որ ֆայլը գոյություն ունի
        await fs.access(filepath);
        
        res.download(filepath, filename);
    } catch (error) {
        res.status(404).json({ success: false, error: 'Ֆայլը չի գտնվել' });
    }
});

// Բոլոր տվյալների հեռացում
app.delete('/api/clear-all', async (req, res) => {
    try {
        await ensureDataDir();
        const files = await fs.readdir(DATA_DIR);
        
        for (const file of files) {
            await fs.unlink(path.join(DATA_DIR, file));
        }
        
        console.log('🗑️ Բոլոր տվյալները հեռացված են');
        res.json({ success: true, message: 'Բոլոր տվյալները հեռացված են' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Սերվերի գործարկում
app.listen(PORT, () => {
    console.log(`🚀 Սերվերը գործարկված է http://localhost:${PORT}`);
    console.log(`📁 Տվյալները պահպանվում են՝ ${DATA_DIR}`);
});