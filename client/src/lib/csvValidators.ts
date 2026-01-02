type ValidationResult = { ok: true } | { ok: false; error: string };

const isInt = (v: any) => Number.isInteger(Number(v));

export const validators = {
    residents: (row: any, i: number): ValidationResult => {
        if (!row.mcr?.startsWith("M")) return { ok: false, error: `Row ${i}: mcr must start with 'M'` };
        if (typeof row.name !== "string") return { ok: false, error: `Row ${i}: name must be string` };
        if (![1, 2, 3].includes(Number(row.resident_year)))
            return { ok: false, error: `Row ${i}: resident_year must be 1, 2, or 3` };
        if (!isInt(row.career_blocks_completed) || Number(row.career_blocks_completed) < 0)
            return { ok: false, error: `Row ${i}: career_blocks_completed must be >= 0` };
            return { ok: true };
    },

    postings: (row: any, i: number): ValidationResult => {
        if (!row.posting_code?.includes("(") || !row.posting_code?.includes(")"))
            return { ok: false, error: `Row ${i}: posting_code must contain ()` };
        if (!row.posting_name?.includes("(") || !row.posting_name?.includes(")"))
            return { ok: false, error: `Row ${i}: posting_name must contain ()` };
        if (!["core", "elective"].includes(row.posting_type))
            return { ok: false, error: `Row ${i}: posting_type must be core or elective` };
        if (!isInt(row.max_residents) || Number(row.max_residents) < 0)
            return { ok: false, error: `Row ${i}: max_residents must be >= 0` };
        if (!isInt(row.required_block_duration) || Number(row.required_block_duration) < 1)
            return { ok: false, error: `Row ${i}: required_block_duration must be >= 1` };
            return { ok: true };
    },
};