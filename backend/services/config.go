package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"konnekt/backend/models"
)

type ConfigService struct {
	dataDir string
}

func NewConfigService() *ConfigService {
	return &ConfigService{}
}

func (s *ConfigService) SetDataDir(dir string) {
	s.dataDir = dir
}

func (s *ConfigService) GetServerConfigs() ([]models.ServerConfig, error) {
	data, err := os.ReadFile(filepath.Join(s.dataDir, "servers.json"))
	if os.IsNotExist(err) {
		return []models.ServerConfig{}, nil
	}
	if err != nil {
		return nil, err
	}
	var configs []models.ServerConfig
	if err := json.Unmarshal(data, &configs); err != nil {
		return nil, err
	}
	return configs, nil
}

func (s *ConfigService) GetServerConfig(id string) (*models.ServerConfig, error) {
	configs, err := s.GetServerConfigs()
	if err != nil {
		return nil, err
	}
	for i, c := range configs {
		if c.ID == id {
			return &configs[i], nil
		}
	}
	return nil, fmt.Errorf("server config %q not found", id)
}

func (s *ConfigService) SaveServerConfig(cfg models.ServerConfig) error {
	configs, err := s.GetServerConfigs()
	if err != nil {
		return err
	}
	for i, c := range configs {
		if c.ID == cfg.ID {
			configs[i] = cfg
			return s.writeServerConfigs(configs)
		}
	}
	configs = append(configs, cfg)
	return s.writeServerConfigs(configs)
}

func (s *ConfigService) DeleteServerConfig(id string) error {
	configs, err := s.GetServerConfigs()
	if err != nil {
		return err
	}
	filtered := configs[:0]
	for _, c := range configs {
		if c.ID != id {
			filtered = append(filtered, c)
		}
	}
	return s.writeServerConfigs(filtered)
}

func (s *ConfigService) writeServerConfigs(configs []models.ServerConfig) error {
	data, err := json.Marshal(configs)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(s.dataDir, "servers.json"), data, 0644)
}

func (s *ConfigService) GetActiveServerID() (string, error) {
	data, err := os.ReadFile(filepath.Join(s.dataDir, "active_server.json"))
	if os.IsNotExist(err) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	var id string
	if err := json.Unmarshal(data, &id); err != nil {
		return "", err
	}
	return id, nil
}

func (s *ConfigService) SetActiveServerID(id string) error {
	data, err := json.Marshal(id)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(s.dataDir, "active_server.json"), data, 0644)
}
