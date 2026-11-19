package gagalxray

import (
	"context"
	"strings"

	"cch.local/backend/internal/modules/authorization"
	"cch.local/backend/internal/platform/authentication"
)

type Repository interface {
	List(ctx context.Context, query ListQuery) (Page, error)
	Get(ctx context.Context, asal, tujuan, idKiriman, kantongLama string) (KirimanGagalXray, error)
	Create(ctx context.Context, item KirimanGagalXray) error
	Update(ctx context.Context, asal, tujuan, idKiriman, kantongLama string, cmd UpdateCommand, updatedBy string) error
	Delete(ctx context.Context, asal, tujuan, idKiriman, kantongLama string) error
	GetStats(ctx context.Context) (Stats, error)
}

type Service struct {
	authorization *authorization.AccessService
	repository    Repository
}

func NewService(accessService *authorization.AccessService, repository Repository) *Service {
	return &Service{
		authorization: accessService,
		repository:    repository,
	}
}

func (s *Service) validateDependencies() error {
	if s == nil || s.repository == nil {
		return ErrGagalXrayNotConfigured
	}
	return nil
}

func (s *Service) authorize(ctx context.Context, identity authentication.VerifiedIdentity, action authorization.Action) error {
	if s.authorization == nil {
		return nil
	}
	_, err := s.authorization.Authorize(ctx, identity, TableVariable, action)
	return err
}

func (s *Service) List(ctx context.Context, identity authentication.VerifiedIdentity, query ListQuery) (Page, error) {
	if err := s.validateDependencies(); err != nil {
		return Page{}, err
	}
	if err := s.authorize(ctx, identity, authorization.ActionList); err != nil {
		return Page{}, err
	}
	return s.repository.List(ctx, query)
}

func (s *Service) Get(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string) (KirimanGagalXray, error) {
	if err := s.validateDependencies(); err != nil {
		return KirimanGagalXray{}, err
	}
	if err := s.authorize(ctx, identity, authorization.ActionView); err != nil {
		return KirimanGagalXray{}, err
	}
	asal = strings.TrimSpace(asal)
	tujuan = strings.TrimSpace(tujuan)
	idKiriman = strings.TrimSpace(idKiriman)
	kantongLama = strings.TrimSpace(kantongLama)
	if asal == "" || tujuan == "" || idKiriman == "" || kantongLama == "" {
		return KirimanGagalXray{}, ErrCompositeKeyRequired
	}
	return s.repository.Get(ctx, asal, tujuan, idKiriman, kantongLama)
}

func (s *Service) Create(ctx context.Context, identity authentication.VerifiedIdentity, cmd CreateCommand) (KirimanGagalXray, error) {
	if err := s.validateDependencies(); err != nil {
		return KirimanGagalXray{}, err
	}
	if err := s.authorize(ctx, identity, authorization.ActionAdd); err != nil {
		return KirimanGagalXray{}, err
	}
	if err := cmd.Validate(); err != nil {
		return KirimanGagalXray{}, err
	}

	actor := strings.TrimSpace(identity.Username)
	if actor == "" {
		actor = "system"
	}

	item := KirimanGagalXray{
		KantorAsal:        strings.TrimSpace(cmd.KantorAsal),
		KantorTujuan:      strings.TrimSpace(cmd.KantorTujuan),
		IDKiriman:         strings.TrimSpace(cmd.IDKiriman),
		IDKantongLama:     strings.TrimSpace(cmd.IDKantongLama),
		IDKantongBaru:     strings.TrimSpace(cmd.IDKantongBaru),
		IsiKiriman:        strings.TrimSpace(cmd.IsiKiriman),
		Berat:             cmd.Berat,
		Keterangan:        strings.TrimSpace(cmd.Keterangan),
		Tanggal:           strings.TrimSpace(cmd.Tanggal),
		KantorPenerbangan: strings.TrimSpace(cmd.KantorPenerbangan),
		FileBeritaAcara:   strings.TrimSpace(cmd.FileBeritaAcara),
		DitambahOleh:      actor,
		DiubahOleh:        actor,
	}

	if err := s.repository.Create(ctx, item); err != nil {
		return KirimanGagalXray{}, err
	}

	return s.repository.Get(ctx, item.KantorAsal, item.KantorTujuan, item.IDKiriman, item.IDKantongLama)
}

func (s *Service) Update(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string, cmd UpdateCommand) (KirimanGagalXray, error) {
	if err := s.validateDependencies(); err != nil {
		return KirimanGagalXray{}, err
	}
	if err := s.authorize(ctx, identity, authorization.ActionEdit); err != nil {
		return KirimanGagalXray{}, err
	}
	asal = strings.TrimSpace(asal)
	tujuan = strings.TrimSpace(tujuan)
	idKiriman = strings.TrimSpace(idKiriman)
	kantongLama = strings.TrimSpace(kantongLama)
	if asal == "" || tujuan == "" || idKiriman == "" || kantongLama == "" {
		return KirimanGagalXray{}, ErrCompositeKeyRequired
	}
	if err := cmd.Validate(); err != nil {
		return KirimanGagalXray{}, err
	}

	actor := strings.TrimSpace(identity.Username)
	if actor == "" {
		actor = "system"
	}

	if err := s.repository.Update(ctx, asal, tujuan, idKiriman, kantongLama, cmd, actor); err != nil {
		return KirimanGagalXray{}, err
	}

	return s.repository.Get(ctx, asal, tujuan, idKiriman, kantongLama)
}

func (s *Service) Delete(ctx context.Context, identity authentication.VerifiedIdentity, asal, tujuan, idKiriman, kantongLama string) error {
	if err := s.validateDependencies(); err != nil {
		return err
	}
	if err := s.authorize(ctx, identity, authorization.ActionDelete); err != nil {
		return err
	}
	asal = strings.TrimSpace(asal)
	tujuan = strings.TrimSpace(tujuan)
	idKiriman = strings.TrimSpace(idKiriman)
	kantongLama = strings.TrimSpace(kantongLama)
	if asal == "" || tujuan == "" || idKiriman == "" || kantongLama == "" {
		return ErrCompositeKeyRequired
	}
	return s.repository.Delete(ctx, asal, tujuan, idKiriman, kantongLama)
}

func (s *Service) Stats(ctx context.Context, identity authentication.VerifiedIdentity) (Stats, error) {
	if err := s.validateDependencies(); err != nil {
		return Stats{}, err
	}
	if err := s.authorize(ctx, identity, authorization.ActionList); err != nil {
		return Stats{}, err
	}
	return s.repository.GetStats(ctx)
}
