export class DateService {
  /**
   * Adds specified number of days to a date string.
   */
  static addDays(date: Date | string, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Formats a date cleanly (e.g. "10 Aug 2026")
   */
  static formatDate(dateString: string): string {
    if (!dateString) return "N/A";
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "N/A";
      const day = d.getDate();
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return "N/A";
    }
  }

  /**
   * Evaluates if a given date string is overdue.
   */
  static isOverdue(dueDateString: string): boolean {
    const today = new Date();
    const dueDate = new Date(dueDateString);
    return today > dueDate;
  }
}
