export const formatIssues = (issues, source) =>
  issues.flatMap((issue) => {
    const base = issue.path.map(String);
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({
        field: [source, ...base, key].join("."),
        message: "Unknown field",
      }));
    }

    return [{ field: [source, ...base].join("."), message: issue.message }];
  });
