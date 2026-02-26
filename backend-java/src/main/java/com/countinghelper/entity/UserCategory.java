package com.countinghelper.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "user_categories", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "name"}))
public class UserCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

    public UserCategory() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}
