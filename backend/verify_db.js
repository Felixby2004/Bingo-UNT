const { query } = require('./db');
require('dotenv').config();

const verifyUsers = async () => {
  try {
    const res = await query('SELECT id, username, email, two_fa_enabled FROM admin_users');
    console.log('--- Usuarios en la Base de Datos ---');
    console.table(res.rows);
    
    const imazada = res.rows.find(u => u.username === 'imazada');
    if (imazada) {
      console.log('✅ Usuario imazada encontrado.');
      if (imazada.email === 'fipoloniora@unitru.edu.pe') {
        console.log('✅ Correo de imazada es correcto.');
      } else {
        console.log(`❌ Correo de imazada es INCORRECTO: ${imazada.email}`);
      }
    } else {
      console.log('❌ Usuario imazada NO encontrado.');
    }
  } catch (err) {
    console.error('❌ Error al verificar usuarios:', err);
  } finally {
    process.exit();
  }
};

verifyUsers();
