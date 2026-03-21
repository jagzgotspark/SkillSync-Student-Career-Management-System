const db = require("../config/db");

exports.getAllCareers = async (req, res) => {
    try {
        const sql = `SELECT jr.*, c.company_name, c.industry 
                     FROM JobRoles jr 
                     JOIN Companies c ON jr.company_id = c.company_id`;
        const careers = await db.query(sql);
        res.json(careers);
    } catch (err) {
        console.error("[GET ALL CAREERS ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};

exports.getCareerDetails = async (req, res) => {
    try {
        const sql = `SELECT jr.*, c.company_name, c.industry, c.location as company_location 
                     FROM JobRoles jr 
                     JOIN Companies c ON jr.company_id = c.company_id`;
        const careers = await db.query(sql);
        
        // Enrich data for frontend expectation
        const enriched = careers.map(c => ({
            career_id: c.role_id,
            career_name: c.role_name,
            company_name: c.company_name,
            average_salary: c.salary_range,
            growth_rate: '22% YoY',
            required_skills: c.required_skills
        }));
        res.json(enriched);
    } catch (err) {
        console.error("[GET CAREER DETAILS ERROR]", err);
        res.status(500).json({ error: "Database error" });
    }
};