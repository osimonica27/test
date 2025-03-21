import requests
import os

def search_files(repo, pattern):
    search_url = f"https://api.github.com/search/code?q=repo:{repo}+filename:{pattern}"
    headers = {
        "Accept": "application/vnd.github.v3+json"
    }
    response = requests.get(search_url, headers=headers)
    response.raise_for_status()
    return response.json()["items"]

def generate_report(files, output_file):
    with open(output_file, "w") as f:
        for file_info in files:
            f.write(file_info["path"] + "\n")

def main():
    repo = "osimonica27/test"  # Replace with your repository
    pattern = "*.json*"       # Replace with the pattern you are searching for
    output_file = "file_report.txt"

    # Search for files
    files = search_files(repo, pattern)

    # Generate the report
    generate_report(files, output_file)
    print(f"Report generated: {output_file}")

if __name__ == "__main__":
    main()
