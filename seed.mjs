import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Initialize Firebase using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const rawData = `Abelando	Jairo Israel	1°	A	Activo	
Aiger Chiesa	Mía	1°	A	Activo	
Arditti	Victoria	1°	A	Activo	
Barcos	María Justa	1°	A	Activo	
Baucero	Charo	1°	A	Activo	
Benedetti	Martina	1°	A	Activo	
Bernal	Francisco	1°	A	Activo	
Bonnet Dopazo	Julieta	1°	A	Activo	
D'amico Barros	Lucca	1°	A	Activo	
Dalmazzo Landaida	Franco	1°	A	Activo	
De Moliner	Malena	1°	A	Activo	
Fernandez Pereson	Maria Cecilia	1°	A	Activo	
Fernandez Rousseaux	Maria del Rosario	1°	A	Activo	
Garmendia	Ramiro	1°	A	Activo	
Gatti Diaz	Nina	1°	A	Activo	
Ifran Galaz	Clara Eugenia	1°	A	Activo	
Lovatto	Juan Bautista	1°	A	Activo	
Minatta Terraza	Lucas	1°	A	Activo	
Monaco Dalinger	David	1°	A	Activo	
Montes De Oca Budes	Paula Nicole	1°	A	Activo	
Ormaechea	Juana	1°	A	Activo	
Parravicini	Gino	1°	A	Activo	
Re	Margarita	1°	A	Activo	
Rode	Martina	1°	A	Activo	
Sguerzo	León Bautista	1°	A	Activo	
Vicente Massera	Thiago Giovanni	1°	A	Activo	
Agüero Gatti	Francisco	2°	A	Activo	
Alba	Vera	2°	A	Activo	
Alvarez	Juan Antonio	2°	A	Activo	
Alvarez	Martina Belén	2°	A	Activo	
Barsotti	Evan Jeremías	2°	A	Activo	
Blasón	Martina	2°	A	Activo	
Bosetti Orso	Henrique	2°	A	Activo	
Cook	María Justina	2°	A	Activo	
Cordiviola	Morena	2°	A	Activo	
Del Valle	Robertina	2°	A	Activo	
Grattarola Mardon	Gonzalo	2°	A	Activo	
La Rosa	Martina	2°	A	Activo	
Lombardo	Alma	2°	A	Activo	
Lopez Medina	Augusto	2°	A	Activo	
Monge	Juan Diego	2°	A	Activo	
Montañana	Emma Francisca	2°	A	Activo	
Nadal	Zoe	2°	A	Activo	
Nietzel Morello	Jazmín Catalina	2°	A	Activo	
Notaliberto	Lucas	2°	A	Activo	
Omacini	Francesca	2°	A	Activo	
Pascal Panozzo Mela	Matilda	2°	A	Activo	
Pereira Bellingeri	Tabaré	2°	A	Activo	
Quetglas	Bernardita	2°	A	Activo	
Quinodóz Piccart	Fausto Sebastián	2°	A	Activo	
Reymundo	Anna	2°	A	Activo	
Rodriguez	Gianna Narella	2°	A	Activo	
Roldan Ciancio	Emilia	2°	A	Activo	
Satto	Cipriano	2°	A	Activo	
Tomba	Lucía	2°	A	Activo	
Turano	Vicente	2°	A	Activo	
Williams	Uma	2°	A	Activo	
Balbuena	Alfonsina Gabriela	3°	A	Activo	
Bataglia Cevey	Ana	3°	A	Activo	
Baucero	Ciro	3°	A	Activo	
Bonnin Bonnet	Maite	3°	A	Activo	
Carletti	Juliana	3°	A	Activo	
Ciancio	Mateo	3°	A	Activo	
Enriquez Pino	Sol	3°	A	Activo	
Fabre	Francisca Faustina	3°	A	Activo	
Fernandez Pereson	Ángel Patricio	3°	A	Activo	
Grattarola Mardon	Nacho	3°	A	Activo	
Mathieu Mockert	Juana	3°	A	Activo	
Moreyra Gieco	Valentina Mariel	3°	A	Activo	
Pereira Prat	Tomás	3°	A	Activo	
Perez	Lucía	3°	A	Activo	
Quiroga	Santino	3°	A	Activo	
Rodenas	Pía	3°	A	Activo	
Ruhl Moser	Alfonsina	3°	A	Activo	
Schultheis Albizzatti	Uma	3°	A	Activo	
Tomba	Isabella	3°	A	Activo	
Torres	María Emilia	3°	A	Activo	
Ziliani	Valentino Adrián	3°	A	Activo	
Zuluaga	Bautista	3°	A	Activo	
Zuluaga	Clara	3°	A	Activo	
Acosta Morford	Mía Isabella	4°	A	Activo	
Beltrami	Camila	4°	A	Activo	
Chappuis	Benjamín	4°	A	Activo	
Chappuis Garcia	Santiago	4°	A	Activo	
Cámara Guerrero	Trinidad	4°	A	Activo	
Diaz Casals	Francisco Germán	4°	A	Activo	
Esbaesderman Ferreri	Malena	4°	A	Activo	
Felipuzzi Pérez	Sofía	4°	A	Activo	
Hermida Erpen	Milagros Agostina	4°	A	Activo	
Joannas	Victoria	4°	A	Activo	
Larrea Casaretto	Josefina	4°	A	Activo	
Leiva	Valentino	4°	A	Activo	
Manevy Arbos	Lola	4°	A	Activo	
Martinez de la Cruz	Xavier	4°	A	Activo	
Monaco Dalinger	Valentina	4°	A	Activo	
Navarro Torres	Julia	4°	A	Activo	
Oliva	Josefina	4°	A	Activo	
Paoli	Manuela	4°	A	Activo	
Parravicini	Stefano	4°	A	Activo	
Quetglas	Benjamín	4°	A	Activo	
Squivo	Natanael	4°	A	Activo	
Torres	Felipe Augusto	4°	A	Activo	
Torres Schimpf	Delfina	4°	A	Activo	
Agüero Gatti	Ignacio	5°	A	Activo	
Alcobo	Itza Magalí	5°	A	Activo	
Cabral Dalmazzo	Malena	5°	A	Activo	
Caccioppoli Marquez	Magdalena	5°	A	Activo	
Carletti	Máximo	5°	A	Activo	
Etcheverry	Vicente	5°	A	Activo	
Fernandez Sanders Hilarza	Ramses	5°	A	Activo	
Giordanengo	Benjamín Leonel	5°	A	Activo	
Luna	Rodrigo Santino	5°	A	Activo	
Paas Quinteros	Ciro	5°	A	Activo	
Pascal Panozzo	Mateo	5°	A	Activo	
Portillo	Clara Luján	5°	A	Activo	
Posse Suarez	Joaquín	5°	A	Activo	
Prediger	Matías Benjamín	5°	A	Activo	
Reymundo	Sofía	5°	A	Activo	
Santacruz Gutierrez	Alma	5°	A	Activo	
Segovia Reymundo	Ana Paula	5°	A	Activo	
Socas	Ignacio Julián	5°	A	Activo	
Acosta Morford	Olivia Amelie	6°	A	Activo	
Barboza	Micol	6°	A	Activo	
Caire	Natalia Valentina	6°	A	Activo	
Del Valle	Avril	6°	A	Activo	
Diaz Sandoval	Agustina	6°	A	Activo	
Notaliberto	Sofía	6°	A	Activo	
Paoli	Alfonso José	6°	A	Activo	
Villordo	Ingrid Abigail	6°	A	Activo	
Vinzón	Daniela Lucía	6°	A	Activo`;

async function seed() {
  const lines = rawData.split('\n').filter(l => l.trim() !== '');
  
  // Track courses
  const courseMap = new Map();

  console.log("Creando cursos...");
  for (const line of lines) {
    const parts = line.split('\t').map(p => p.trim());
    if (parts.length < 3) continue;

    const lastName = parts[0];
    const firstName = parts[1];
    const year = parts[2]; // "1°"
    
    // Ignore division, the course name is just the year
    const courseName = year;
    const courseSlug = year.replace('°', 'to').toLowerCase(); // e.g. "1to"

    if (!courseMap.has(courseSlug)) {
      // Create course
      await setDoc(doc(db, "courses", courseSlug), {
        name: courseName,
        shift: "Mañana",
        accessPin: ""
      });
      courseMap.set(courseSlug, true);
      console.log(`Curso ${courseName} creado (${courseSlug}).`);
    }

    // Create student
    await addDoc(collection(db, "students"), {
      courseId: courseSlug,
      firstName,
      lastName,
      active: true
    });
    console.log(`Alumno ${firstName} ${lastName} añadido a ${courseName}.`);
  }

  console.log("¡Carga completada!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
