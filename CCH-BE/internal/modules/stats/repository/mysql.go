package repository

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"cch.local/backend/internal/modules/stats"
)

type MySQLRepository struct {
	db *sql.DB
}

func NewMySQL(db *sql.DB) *MySQLRepository {
	return &MySQLRepository{db: db}
}

func NewMySQLRepository(db *sql.DB) *MySQLRepository {
	return NewMySQL(db)
}

func (repo *MySQLRepository) GetSummary(ctx context.Context) (stats.Summary, error) {
	now := time.Now()
	year, month, date := now.Year(), int(now.Month()), now.Day()

	var summary stats.Summary

	// Total hits
	_ = repo.db.QueryRowContext(ctx,
		"SELECT Counter FROM cch_stats_counter WHERE Type = 'total' AND Variable = 'hits'",
	).Scan(&summary.TotalHits)

	// Total unique visitors
	_ = repo.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM cch_stats_counterlog",
	).Scan(&summary.TotalUniqueVisitors)

	// Today's hits
	_ = repo.db.QueryRowContext(ctx,
		"SELECT Hits FROM cch_stats_date WHERE Year = ? AND Month = ? AND Date = ?",
		year, month, date,
	).Scan(&summary.TodayHits)

	// Month's hits
	_ = repo.db.QueryRowContext(ctx,
		"SELECT Hits FROM cch_stats_month WHERE Year = ? AND Month = ?",
		year, month,
	).Scan(&summary.MonthHits)

	// Year's hits
	_ = repo.db.QueryRowContext(ctx,
		"SELECT Hits FROM cch_stats_year WHERE Year = ?",
		year,
	).Scan(&summary.YearHits)

	// Browsers breakdown
	browserRows, err := repo.db.QueryContext(ctx,
		"SELECT Variable, Counter FROM cch_stats_counter WHERE Type = 'browser' ORDER BY Counter DESC",
	)
	if err == nil {
		defer browserRows.Close()
		var totalBrowserCount int64
		for browserRows.Next() {
			var item stats.CounterItem
			item.Type = "browser"
			if err := browserRows.Scan(&item.Variable, &item.Counter); err == nil {
				totalBrowserCount += item.Counter
				summary.Browsers = append(summary.Browsers, item)
			}
		}
		if totalBrowserCount > 0 {
			for i := range summary.Browsers {
				summary.Browsers[i].Percentage = float64(summary.Browsers[i].Counter*10000/totalBrowserCount) / 100.0
			}
		}
	}

	// OS breakdown
	osRows, err := repo.db.QueryContext(ctx,
		"SELECT Variable, Counter FROM cch_stats_counter WHERE Type = 'os' ORDER BY Counter DESC",
	)
	if err == nil {
		defer osRows.Close()
		var totalOSCount int64
		for osRows.Next() {
			var item stats.CounterItem
			item.Type = "os"
			if err := osRows.Scan(&item.Variable, &item.Counter); err == nil {
				totalOSCount += item.Counter
				summary.OperatingSystems = append(summary.OperatingSystems, item)
			}
		}
		if totalOSCount > 0 {
			for i := range summary.OperatingSystems {
				summary.OperatingSystems[i].Percentage = float64(summary.OperatingSystems[i].Counter*10000/totalOSCount) / 100.0
			}
		}
	}

	return summary, nil
}

func (repo *MySQLRepository) GetHourly(ctx context.Context, year, month, date int) ([]stats.HourlyStat, error) {
	// Initialize all 24 hours
	hourly := make([]stats.HourlyStat, 24)
	for h := 0; h < 24; h++ {
		hourly[h] = stats.HourlyStat{Hour: h, Hits: 0}
	}

	rows, err := repo.db.QueryContext(ctx,
		"SELECT Hour, Hits FROM cch_stats_hour WHERE Year = ? AND Month = ? AND Date = ? ORDER BY Hour ASC",
		year, month, date,
	)
	if err != nil {
		return hourly, nil
	}
	defer rows.Close()

	for rows.Next() {
		var h int
		var hits int64
		if err := rows.Scan(&h, &hits); err == nil && h >= 0 && h < 24 {
			hourly[h].Hits = hits
		}
	}
	return hourly, nil
}

func (repo *MySQLRepository) GetDaily(ctx context.Context, year, month int) ([]stats.DailyStat, error) {
	rows, err := repo.db.QueryContext(ctx,
		"SELECT Year, Month, Date, Hits FROM cch_stats_date WHERE Year = ? AND Month = ? ORDER BY Date ASC",
		year, month,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []stats.DailyStat
	for rows.Next() {
		var item stats.DailyStat
		if err := rows.Scan(&item.Year, &item.Month, &item.Date, &item.Hits); err == nil {
			result = append(result, item)
		}
	}
	return result, nil
}

func (repo *MySQLRepository) GetMonthly(ctx context.Context, year int) ([]stats.MonthlyStat, error) {
	// Initialize 12 months
	monthly := make([]stats.MonthlyStat, 12)
	for m := 1; m <= 12; m++ {
		monthly[m-1] = stats.MonthlyStat{Year: year, Month: m, Hits: 0}
	}

	rows, err := repo.db.QueryContext(ctx,
		"SELECT Month, Hits FROM cch_stats_month WHERE Year = ? ORDER BY Month ASC",
		year,
	)
	if err != nil {
		return monthly, nil
	}
	defer rows.Close()

	for rows.Next() {
		var m int
		var hits int64
		if err := rows.Scan(&m, &hits); err == nil && m >= 1 && m <= 12 {
			monthly[m-1].Hits = hits
		}
	}
	return monthly, nil
}

func (repo *MySQLRepository) GetYearly(ctx context.Context) ([]stats.YearlyStat, error) {
	rows, err := repo.db.QueryContext(ctx,
		"SELECT Year, Hits FROM cch_stats_year ORDER BY Year ASC",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []stats.YearlyStat
	for rows.Next() {
		var item stats.YearlyStat
		if err := rows.Scan(&item.Year, &item.Hits); err == nil {
			result = append(result, item)
		}
	}
	return result, nil
}

func (repo *MySQLRepository) ListVisitorLogs(ctx context.Context, limit, offset int, search string) (stats.VisitorLogPage, error) {
	if limit <= 0 {
		limit = 25
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	var total int64
	var rows *sql.Rows
	var err error

	search = strings.TrimSpace(search)
	if search != "" {
		filter := "%" + search + "%"
		_ = repo.db.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM cch_stats_counterlog WHERE IP_Address LIKE ? OR Hostname LIKE ?",
			filter, filter,
		).Scan(&total)

		rows, err = repo.db.QueryContext(ctx,
			"SELECT IP_Address, COALESCE(Hostname, ''), First_Visit, Last_Visit, Counter FROM cch_stats_counterlog WHERE IP_Address LIKE ? OR Hostname LIKE ? ORDER BY Last_Visit DESC LIMIT ? OFFSET ?",
			filter, filter, limit, offset,
		)
	} else {
		_ = repo.db.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM cch_stats_counterlog",
		).Scan(&total)

		rows, err = repo.db.QueryContext(ctx,
			"SELECT IP_Address, COALESCE(Hostname, ''), First_Visit, Last_Visit, Counter FROM cch_stats_counterlog ORDER BY Last_Visit DESC LIMIT ? OFFSET ?",
			limit, offset,
		)
	}

	if err != nil {
		return stats.VisitorLogPage{Data: []stats.VisitorLog{}, Total: total, Limit: limit, Offset: offset}, err
	}
	defer rows.Close()

	var items []stats.VisitorLog
	for rows.Next() {
		var item stats.VisitorLog
		var first, last time.Time
		if err := rows.Scan(&item.IPAddress, &item.Hostname, &first, &last, &item.Counter); err == nil {
			item.FirstVisit = first
			item.LastVisit = last
			items = append(items, item)
		}
	}
	return stats.VisitorLogPage{Data: items, Total: total, Limit: limit, Offset: offset}, nil
}

func (repo *MySQLRepository) RecordHit(ctx context.Context, ip, userAgent string) error {
	now := time.Now()
	year, month, date, hour := now.Year(), int(now.Month()), now.Day(), now.Hour()

	ip = strings.TrimSpace(ip)
	if ip == "" {
		ip = "127.0.0.1"
	}
	browser := parseBrowser(userAgent)
	os := parseOS(userAgent)

	// 1. Log IP visit
	_, _ = repo.db.ExecContext(ctx,
		`INSERT INTO cch_stats_counterlog (IP_Address, Hostname, First_Visit, Last_Visit, Counter)
		 VALUES (?, ?, NOW(), NOW(), 1)
		 ON DUPLICATE KEY UPDATE Last_Visit = NOW(), Counter = Counter + 1`,
		ip, ip,
	)

	// 2. Increment total hits
	_, _ = repo.db.ExecContext(ctx,
		`INSERT INTO cch_stats_counter (Type, Variable, Counter)
		 VALUES ('total', 'hits', 1)
		 ON DUPLICATE KEY UPDATE Counter = Counter + 1`,
	)

	// 3. Increment browser count
	_, _ = repo.db.ExecContext(ctx,
		`INSERT INTO cch_stats_counter (Type, Variable, Counter)
		 VALUES ('browser', ?, 1)
		 ON DUPLICATE KEY UPDATE Counter = Counter + 1`,
		browser,
	)

	// 4. Increment OS count
	_, _ = repo.db.ExecContext(ctx,
		`INSERT INTO cch_stats_counter (Type, Variable, Counter)
		 VALUES ('os', ?, 1)
		 ON DUPLICATE KEY UPDATE Counter = Counter + 1`,
		os,
	)

	// 5. Year count
	_, _ = repo.db.ExecContext(ctx,
		`INSERT INTO cch_stats_year (Year, Hits)
		 VALUES (?, 1)
		 ON DUPLICATE KEY UPDATE Hits = Hits + 1`,
		year,
	)

	// 6. Month count
	_, _ = repo.db.ExecContext(ctx,
		`INSERT INTO cch_stats_month (Year, Month, Hits)
		 VALUES (?, ?, 1)
		 ON DUPLICATE KEY UPDATE Hits = Hits + 1`,
		year, month,
	)

	// 7. Date count
	_, _ = repo.db.ExecContext(ctx,
		`INSERT INTO cch_stats_date (Year, Month, Date, Hits)
		 VALUES (?, ?, ?, 1)
		 ON DUPLICATE KEY UPDATE Hits = Hits + 1`,
		year, month, date,
	)

	// 8. Hour count
	_, _ = repo.db.ExecContext(ctx,
		`INSERT INTO cch_stats_hour (Year, Month, Date, Hour, Hits)
		 VALUES (?, ?, ?, ?, 1)
		 ON DUPLICATE KEY UPDATE Hits = Hits + 1`,
		year, month, date, hour,
	)

	return nil
}

func parseBrowser(ua string) string {
	lower := strings.ToLower(ua)
	switch {
	case strings.Contains(lower, "edg"):
		return "Edge"
	case strings.Contains(lower, "chrome") && !strings.Contains(lower, "edg"):
		return "Chrome"
	case strings.Contains(lower, "firefox"):
		return "FireFox"
	case strings.Contains(lower, "safari") && !strings.Contains(lower, "chrome"):
		return "Safari"
	case strings.Contains(lower, "opera") || strings.Contains(lower, "opr"):
		return "Opera"
	case strings.Contains(lower, "msie") || strings.Contains(lower, "trident"):
		return "MSIE"
	case strings.Contains(lower, "bot") || strings.Contains(lower, "crawler") || strings.Contains(lower, "spider") || strings.Contains(lower, "googlebot"):
		return "Bot"
	case strings.Contains(lower, "konqueror"):
		return "Konqueror"
	case strings.Contains(lower, "lynx"):
		return "Lynx"
	default:
		return "Other"
	}
}

func parseOS(ua string) string {
	lower := strings.ToLower(ua)
	switch {
	case strings.Contains(lower, "android"):
		return "Android"
	case strings.Contains(lower, "iphone") || strings.Contains(lower, "ipad") || strings.Contains(lower, "ios"):
		return "iOS"
	case strings.Contains(lower, "win"):
		return "Windows"
	case strings.Contains(lower, "mac") && !strings.Contains(lower, "iphone"):
		return "Mac"
	case strings.Contains(lower, "linux") && !strings.Contains(lower, "android"):
		return "Linux"
	case strings.Contains(lower, "freebsd"):
		return "FreeBSD"
	case strings.Contains(lower, "sunos"):
		return "SunOS"
	default:
		return "Other"
	}
}
