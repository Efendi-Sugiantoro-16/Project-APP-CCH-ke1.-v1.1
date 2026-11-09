package stats

import (
	"context"
	"strings"
	"time"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

const TableVariable = "cch_stats_counter"

type AuthorizationService interface {
	Authorize(context.Context, authentication.VerifiedIdentity, string, authorization.Action) (authorization.AccountAccess, error)
}

type Service struct {
	authorization AuthorizationService
	repository    Repository
}

func NewService(authorization AuthorizationService, repository Repository) *Service {
	return &Service{
		authorization: authorization,
		repository:    repository,
	}
}

func (service *Service) GetSummary(ctx context.Context, identity authentication.VerifiedIdentity) (Summary, error) {
	if err := service.validateDependencies(); err != nil {
		return Summary{}, err
	}
	if !isAllowedAdmin(identity) {
		if _, err := service.authorization.Authorize(ctx, identity, TableVariable, authorization.ActionView); err != nil {
			return Summary{}, err
		}
	}
	return service.repository.GetSummary(ctx)
}

func (service *Service) GetTrends(ctx context.Context, identity authentication.VerifiedIdentity, period string, year, month, date int) (Trends, error) {
	if err := service.validateDependencies(); err != nil {
		return Trends{}, err
	}
	if !isAllowedAdmin(identity) {
		if _, err := service.authorization.Authorize(ctx, identity, TableVariable, authorization.ActionView); err != nil {
			return Trends{}, err
		}
	}

	now := time.Now()
	if year <= 0 {
		year = now.Year()
	}
	if month <= 0 || month > 12 {
		month = int(now.Month())
	}
	if date <= 0 || date > 31 {
		date = now.Day()
	}

	trends := Trends{
		Period: period,
		Year:   year,
		Month:  month,
		Date:   date,
	}

	switch period {
	case "hourly":
		hourly, err := service.repository.GetHourly(ctx, year, month, date)
		if err != nil {
			return Trends{}, err
		}
		trends.Hourly = hourly
	case "daily":
		daily, err := service.repository.GetDaily(ctx, year, month)
		if err != nil {
			return Trends{}, err
		}
		trends.Daily = daily
	case "monthly":
		monthly, err := service.repository.GetMonthly(ctx, year)
		if err != nil {
			return Trends{}, err
		}
		trends.Monthly = monthly
	case "yearly":
		yearly, err := service.repository.GetYearly(ctx)
		if err != nil {
			return Trends{}, err
		}
		trends.Yearly = yearly
	default:
		// Default to daily for current month
		daily, err := service.repository.GetDaily(ctx, year, month)
		if err != nil {
			return Trends{}, err
		}
		trends.Period = "daily"
		trends.Daily = daily
	}

	return trends, nil
}

func (service *Service) ListVisitorLogs(ctx context.Context, identity authentication.VerifiedIdentity, limit, offset int, search string) (VisitorLogPage, error) {
	if err := service.validateDependencies(); err != nil {
		return VisitorLogPage{}, err
	}
	if !isAllowedAdmin(identity) {
		if _, err := service.authorization.Authorize(ctx, identity, TableVariable, authorization.ActionView); err != nil {
			return VisitorLogPage{}, err
		}
	}
	return service.repository.ListVisitorLogs(ctx, limit, offset, search)
}

func (service *Service) RecordHit(ctx context.Context, ip, userAgent string) error {
	if service == nil || service.repository == nil {
		return ErrServiceNotReady
	}
	return service.repository.RecordHit(ctx, ip, userAgent)
}

func (service *Service) validateDependencies() error {
	if service == nil || service.authorization == nil || service.repository == nil {
		return ErrServiceNotReady
	}
	return nil
}

func isAllowedAdmin(identity authentication.VerifiedIdentity) bool {
	if identity.Username == "" {
		return false
	}
	parts := strings.Split(identity.UserLevelID, ",")
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "-1" || p == "9" || p == "19" || p == "29" {
			return true
		}
	}
	return false
}
