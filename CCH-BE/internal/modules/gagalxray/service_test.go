package gagalxray_test

import (
	"context"
	"testing"

	"cch.local/backend/internal/modules/gagalxray"
	"cch.local/backend/internal/platform/authentication"
)

type mockRepo struct {
	items map[string]gagalxray.KirimanGagalXray
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		items: map[string]gagalxray.KirimanGagalXray{
			"10000:20000:P2201:K01": {
				KantorAsal:        "10000",
				NamaKantorAsal:    "JAKARTA CENTRUM",
				KantorTujuan:      "20000",
				NamaKantorTujuan:  "BANDUNG",
				IDKiriman:         "P2201",
				IDKantongLama:     "K01",
				IDKantongBaru:     "KB01",
				IsiKiriman:        "BATTERY",
				Berat:             1.5,
				Keterangan:        "1",
				KeteranganText:    "Diteruskan via Darat/Laut",
				Tanggal:           "2026-01-05",
				KantorPenerbangan: "19000",
			},
		},
	}
}

func (m *mockRepo) key(asal, tujuan, id, kantong string) string {
	return asal + ":" + tujuan + ":" + id + ":" + kantong
}

func (m *mockRepo) List(ctx context.Context, query gagalxray.ListQuery) (gagalxray.Page, error) {
	var list []gagalxray.KirimanGagalXray
	for _, it := range m.items {
		list = append(list, it)
	}
	return gagalxray.Page{
		Items:  list,
		Total:  len(list),
		Limit:  query.Limit,
		Offset: query.Offset,
	}, nil
}

func (m *mockRepo) Get(ctx context.Context, asal, tujuan, idKiriman, kantongLama string) (gagalxray.KirimanGagalXray, error) {
	k := m.key(asal, tujuan, idKiriman, kantongLama)
	it, ok := m.items[k]
	if !ok {
		return gagalxray.KirimanGagalXray{}, gagalxray.ErrNotFound
	}
	return it, nil
}

func (m *mockRepo) Create(ctx context.Context, item gagalxray.KirimanGagalXray) error {
	k := m.key(item.KantorAsal, item.KantorTujuan, item.IDKiriman, item.IDKantongLama)
	if _, ok := m.items[k]; ok {
		return gagalxray.ErrAlreadyExists
	}
	m.items[k] = item
	return nil
}

func (m *mockRepo) Update(ctx context.Context, asal, tujuan, idKiriman, kantongLama string, cmd gagalxray.UpdateCommand, updatedBy string) error {
	k := m.key(asal, tujuan, idKiriman, kantongLama)
	it, ok := m.items[k]
	if !ok {
		return gagalxray.ErrNotFound
	}
	it.IDKantongBaru = cmd.IDKantongBaru
	it.IsiKiriman = cmd.IsiKiriman
	it.Berat = cmd.Berat
	it.Keterangan = cmd.Keterangan
	it.Tanggal = cmd.Tanggal
	it.KantorPenerbangan = cmd.KantorPenerbangan
	it.FileBeritaAcara = cmd.FileBeritaAcara
	it.DiubahOleh = updatedBy
	m.items[k] = it
	return nil
}

func (m *mockRepo) Delete(ctx context.Context, asal, tujuan, idKiriman, kantongLama string) error {
	k := m.key(asal, tujuan, idKiriman, kantongLama)
	if _, ok := m.items[k]; !ok {
		return gagalxray.ErrNotFound
	}
	delete(m.items, k)
	return nil
}

func (m *mockRepo) GetStats(ctx context.Context) (gagalxray.Stats, error) {
	return gagalxray.Stats{
		TotalRecords:   len(m.items),
		DaratLautCount: 1,
	}, nil
}

func TestGagalXrayService(t *testing.T) {
	repo := newMockRepo()
	svc := gagalxray.NewService(nil, repo)
	ctx := context.Background()
	identity := authentication.VerifiedIdentity{
		Username:    "test.admin",
		UserLevelID: "-1",
	}

	t.Run("List returns items", func(t *testing.T) {
		page, err := svc.List(ctx, identity, gagalxray.ListQuery{Limit: 10})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if page.Total != 1 {
			t.Fatalf("expected 1 item, got %d", page.Total)
		}
	})

	t.Run("Get existing item", func(t *testing.T) {
		item, err := svc.Get(ctx, identity, "10000", "20000", "P2201", "K01")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if item.IsiKiriman != "BATTERY" {
			t.Fatalf("expected BATTERY, got %s", item.IsiKiriman)
		}
	})

	t.Run("Get not found returns ErrNotFound", func(t *testing.T) {
		_, err := svc.Get(ctx, identity, "99999", "20000", "P2201", "K01")
		if err != gagalxray.ErrNotFound {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})

	t.Run("Create new item", func(t *testing.T) {
		cmd := gagalxray.CreateCommand{
			KantorAsal:        "30000",
			KantorTujuan:      "40000",
			IDKiriman:         "P2409",
			IDKantongLama:     "K99",
			IDKantongBaru:     "KB99",
			IsiKiriman:        "AEROSOL",
			Berat:             0.5,
			Keterangan:        "4",
			Tanggal:           "2026-02-01",
			KantorPenerbangan: "19400",
		}
		created, err := svc.Create(ctx, identity, cmd)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if created.IDKiriman != "P2409" {
			t.Fatalf("expected P2409, got %s", created.IDKiriman)
		}

		// duplicate error
		_, err = svc.Create(ctx, identity, cmd)
		if err != gagalxray.ErrAlreadyExists {
			t.Fatalf("expected ErrAlreadyExists, got %v", err)
		}
	})

	t.Run("Update item", func(t *testing.T) {
		cmd := gagalxray.UpdateCommand{
			IDKantongBaru:     "KB99-NEW",
			IsiKiriman:        "AEROSOL SPRAY",
			Berat:             0.7,
			Keterangan:        "4",
			Tanggal:           "2026-02-02",
			KantorPenerbangan: "19400",
		}
		updated, err := svc.Update(ctx, identity, "30000", "40000", "P2409", "K99", cmd)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if updated.IsiKiriman != "AEROSOL SPRAY" {
			t.Fatalf("expected updated IsiKiriman, got %s", updated.IsiKiriman)
		}
	})

	t.Run("Delete item", func(t *testing.T) {
		err := svc.Delete(ctx, identity, "30000", "40000", "P2409", "K99")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		// Verify deleted
		_, err = svc.Get(ctx, identity, "30000", "40000", "P2409", "K99")
		if err != gagalxray.ErrNotFound {
			t.Fatalf("expected ErrNotFound after deletion, got %v", err)
		}
	})

	t.Run("Stats returns aggregated data", func(t *testing.T) {
		stats, err := svc.Stats(ctx, identity)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if stats.TotalRecords != 1 {
			t.Fatalf("expected 1, got %d", stats.TotalRecords)
		}
	})
}
