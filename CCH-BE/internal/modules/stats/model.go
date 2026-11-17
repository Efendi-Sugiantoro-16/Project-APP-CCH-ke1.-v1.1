package stats

import (
	"context"
	"errors"
	"time"
)

var (
	ErrInvalidPeriod   = errors.New("invalid statistics period")
	ErrServiceNotReady = errors.New("statistics catalog is not configured")
)

type CounterItem struct {
	Type       string  `json:"type"`
	Variable   string  `json:"variable"`
	Counter    int64   `json:"counter"`
	Percentage float64 `json:"percentage"`
}

type Summary struct {
	TotalHits           int64         `json:"total_hits"`
	TotalUniqueVisitors int64         `json:"total_unique_visitors"`
	TodayHits           int64         `json:"today_hits"`
	MonthHits           int64         `json:"month_hits"`
	YearHits            int64         `json:"year_hits"`
	Browsers            []CounterItem `json:"browsers"`
	OperatingSystems    []CounterItem `json:"operating_systems"`
}

type HourlyStat struct {
	Hour int   `json:"hour"`
	Hits int64 `json:"hits"`
}

type DailyStat struct {
	Year  int   `json:"year"`
	Month int   `json:"month"`
	Date  int   `json:"date"`
	Hits  int64 `json:"hits"`
}

type MonthlyStat struct {
	Year  int   `json:"year"`
	Month int   `json:"month"`
	Hits  int64 `json:"hits"`
}

type YearlyStat struct {
	Year int   `json:"year"`
	Hits int64 `json:"hits"`
}

type Trends struct {
	Period  string        `json:"period"`
	Year    int           `json:"year"`
	Month   int           `json:"month,omitempty"`
	Date    int           `json:"date,omitempty"`
	Hourly  []HourlyStat  `json:"hourly,omitempty"`
	Daily   []DailyStat   `json:"daily,omitempty"`
	Monthly []MonthlyStat `json:"monthly,omitempty"`
	Yearly  []YearlyStat  `json:"yearly,omitempty"`
}

type VisitorLog struct {
	IPAddress  string    `json:"ip_address"`
	Hostname   string    `json:"hostname"`
	FirstVisit time.Time `json:"first_visit"`
	LastVisit  time.Time `json:"last_visit"`
	Counter    int64     `json:"counter"`
}

type VisitorLogPage struct {
	Data   []VisitorLog `json:"data"`
	Total  int64        `json:"total"`
	Limit  int          `json:"limit"`
	Offset int          `json:"offset"`
}

type HitRecord struct {
	IPAddress string `json:"ip_address"`
	UserAgent string `json:"user_agent"`
	Path      string `json:"path"`
}

type Repository interface {
	GetSummary(ctx context.Context) (Summary, error)
	GetHourly(ctx context.Context, year, month, date int) ([]HourlyStat, error)
	GetDaily(ctx context.Context, year, month int) ([]DailyStat, error)
	GetMonthly(ctx context.Context, year int) ([]MonthlyStat, error)
	GetYearly(ctx context.Context) ([]YearlyStat, error)
	ListVisitorLogs(ctx context.Context, limit, offset int, search string) (VisitorLogPage, error)
	RecordHit(ctx context.Context, ip, userAgent string) error
}
