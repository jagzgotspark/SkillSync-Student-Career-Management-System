import csv
import json

def csv_to_json(csv_file_path, json_file_path):
    data = []
    
    with open(csv_file_path, mode='r', encoding='utf-8') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        
        for row in csv_reader:
            data.append(row)
            
    with open(json_file_path, mode='w', encoding='utf-8') as json_file:
        json.dump(data, json_file, indent=4)
        
    print(f"Successfully converted '{csv_file_path}' to '{json_file_path}'")

if __name__ == "__main__":
    input_csv = r'O:\VIT Chennai\Winter Semester 2025-2026\DBMS\Project\SkillSync-Student-Career-Management-System\All India database full website access-20250628121410-2025-06-28data_pricing121409.csv'
    output_json = r'O:\VIT Chennai\Winter Semester 2025-2026\DBMS\Project\SkillSync-Student-Career-Management-System\All India database full website access-20250628121410-2025-06-28data_pricing121409.json'
    
    try:
        csv_to_json(input_csv, output_json)
    except FileNotFoundError:
        print(f"Error: The file '{input_csv}' was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")
